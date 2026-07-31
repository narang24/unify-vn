import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import {
  chatSessions,
  chatMessages,
  workItems,
  spaces,
  workspaces,
  repositories,
  deployments,
  incidents,
} from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { chatWithAgent, type ChatTurn } from "../lib/aiAgent.js";

export const intelliRouter = Router();
intelliRouter.use(requireAuth);

const VALID_CONTEXT_TYPES = new Set(["workspace", "work_item", "repository", "space"]);
const HISTORY_LIMIT = 20;

/** Builds workspace-aware context for the agent from a session's contextType/contextId. */
async function buildContext(contextType: string | null, contextId: string | null) {
  if (!contextType || !contextId) return { scope: "none" };

  try {
    if (contextType === "work_item") {
      const [item] = await db.select().from(workItems).where(eq(workItems.id, contextId)).limit(1);
      if (!item) return { scope: "work_item", note: "Work item not found." };

      const [space] = await db.select().from(spaces).where(eq(spaces.id, item.spaceId)).limit(1);
      const workspace = space
        ? (await db.select().from(workspaces).where(eq(workspaces.id, space.workspaceId)).limit(1))[0]
        : undefined;
      const repo =
        space?.repositoryId
          ? (await db.select().from(repositories).where(eq(repositories.id, space.repositoryId)).limit(1))[0]
          : undefined;

      return {
        scope: "work_item",
        work_item: item,
        space: space ? { id: space.id, name: space.name, kind: space.kind } : null,
        workspace: workspace ? { id: workspace.id, name: workspace.name } : null,
        repository: repo ? { id: repo.id, name: repo.name, fullName: repo.fullName } : null,
      };
    }

    if (contextType === "repository") {
      const [repo] = await db.select().from(repositories).where(eq(repositories.id, contextId)).limit(1);
      if (!repo) return { scope: "repository", note: "Repository not found." };

      const recentDeployments = await db
        .select()
        .from(deployments)
        .where(eq(deployments.repositoryId, repo.id))
        .orderBy(desc(deployments.triggeredAt))
        .limit(5);

      const recentIncidents = await db
        .select()
        .from(incidents)
        .where(eq(incidents.repositoryId, repo.id))
        .orderBy(desc(incidents.createdAt))
        .limit(5);

      return {
        scope: "repository",
        repository: { id: repo.id, name: repo.name, fullName: repo.fullName, defaultBranch: repo.defaultBranch },
        recent_deployments: recentDeployments,
        recent_incidents: recentIncidents,
      };
    }

    if (contextType === "space") {
      const [space] = await db.select().from(spaces).where(eq(spaces.id, contextId)).limit(1);
      if (!space) return { scope: "space", note: "Space not found." };

      const items = await db
        .select({
          id: workItems.id,
          title: workItems.title,
          type: workItems.type,
          status: workItems.status,
          assignee: workItems.assignee,
          dueDate: workItems.dueDate,
        })
        .from(workItems)
        .where(eq(workItems.spaceId, space.id))
        .orderBy(desc(workItems.updatedAt))
        .limit(30);

      return {
        scope: "space",
        space: { id: space.id, name: space.name, kind: space.kind, columns: space.columns },
        work_items_summary: items,
      };
    }

    // "workspace" or anything else — best-effort shallow context.
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, contextId)).limit(1);
    return workspace
      ? { scope: "workspace", workspace: { id: workspace.id, name: workspace.name } }
      : { scope: contextType };
  } catch (err) {
    console.error("[intelli.buildContext]", err);
    return { scope: contextType, note: "Failed to load full context." };
  }
}

// GET /api/v1/intelli/sessions — list current user's sessions, most recent first, with last-message preview
intelliRouter.get("/intelli/sessions", async (req: AuthedRequest, res) => {
  try {
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, req.userId!))
      .orderBy(desc(chatSessions.updatedAt));

    const withPreview = await Promise.all(
      sessions.map(async (session) => {
        const [last] = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, session.id))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);
        return { ...session, lastMessage: last ?? null };
      }),
    );

    res.json({ sessions: withPreview });
  } catch (err) {
    console.error("[intelli.sessions.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/intelli/sessions/:id — get a session + all its messages
intelliRouter.get("/intelli/sessions/:id", async (req: AuthedRequest, res) => {
  try {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, req.params.id as string), eq(chatSessions.userId, req.userId!)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not found" });

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, session.id))
      .orderBy(asc(chatMessages.createdAt));

    res.json({ session, messages });
  } catch (err) {
    console.error("[intelli.sessions.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/intelli/sessions — create a new session
intelliRouter.post("/intelli/sessions", async (req: AuthedRequest, res) => {
  try {
    const { contextType, contextId, title } = req.body as {
      contextType?: string;
      contextId?: string;
      title?: string;
    };

    if (contextType && !VALID_CONTEXT_TYPES.has(contextType)) {
      return res.status(400).json({ error: "Invalid contextType" });
    }

    const [created] = await db
      .insert(chatSessions)
      .values({
        userId: req.userId!,
        title: title?.trim() || null,
        contextType: (contextType as "workspace" | "work_item" | "repository" | "space") ?? null,
        contextId: contextId ?? null,
      })
      .returning();

    res.status(201).json({ session: created });
  } catch (err) {
    console.error("[intelli.sessions.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/intelli/sessions/:id — delete a session (cascades its messages)
intelliRouter.delete("/intelli/sessions/:id", async (req: AuthedRequest, res) => {
  try {
    const [deleted] = await db
      .delete(chatSessions)
      .where(and(eq(chatSessions.id, req.params.id as string), eq(chatSessions.userId, req.userId!)))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Session not found" });
    res.json({ message: "Session deleted" });
  } catch (err) {
    console.error("[intelli.sessions.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/intelli/sessions/:id/messages — send a message, get the AI's reply
intelliRouter.post("/intelli/sessions/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const sessionId = req.params.id as string;
    const { message } = req.body as { message?: string };

    if (!message?.trim()) return res.status(400).json({ error: "message is required" });

    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, req.userId!)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not found" });

    // Persist the user's message first so it's never lost, even if the AI call fails.
    const [userMessage] = await db
      .insert(chatMessages)
      .values({ sessionId, role: "user", content: message.trim() })
      .returning();

    // Auto-title the session from the first user message.
    if (!session.title) {
      const autoTitle = message.trim().slice(0, 80);
      await db.update(chatSessions).set({ title: autoTitle }).where(eq(chatSessions.id, sessionId));
      session.title = autoTitle;
    }

    const context = await buildContext(session.contextType, session.contextId);

    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(HISTORY_LIMIT);

    const history: ChatTurn[] = recentMessages
      .slice()
      .reverse()
      .filter((m) => m.id !== userMessage!.id) // history is prior turns; current message is sent separately
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let agentReply: { reply: string };
    try {
      agentReply = await chatWithAgent({ message: message.trim(), context, history });
    } catch (err) {
      console.error("[intelli.messages.chat]", err);
      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
      return res.status(502).json({
        error: "AI assistant is unavailable right now. Your message was saved — please try again shortly.",
        userMessage,
      });
    }

    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({ sessionId, role: "assistant", content: agentReply.reply })
      .returning();

    const [updatedSession] = await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    res.status(201).json({ message: assistantMessage, session: updatedSession });
  } catch (err) {
    console.error("[intelli.messages.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
