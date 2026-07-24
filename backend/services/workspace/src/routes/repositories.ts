import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { repositories, workspaces } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { indexRepository } from "../lib/aiAgent.js";

export const repositoriesRouter = Router();

repositoriesRouter.use(requireAuth);

async function assertWorkspaceOwner(workspaceId: string, userId: string) {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!ws) return { ok: false as const, status: 404, error: "Workspace not found" };
  if (ws.ownerId !== userId) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const };
}

// POST /api/v1/workspaces/:id/repositories — connect a repository
repositoriesRouter.post("/workspaces/:id/repositories", async (req: AuthedRequest, res) => {
  try {
    const workspaceId = req.params.id as string;
    const check = await assertWorkspaceOwner(workspaceId, req.userId!);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const { name, fullName, provider, defaultBranch, htmlUrl, avatarColor } = req.body as {
      name?: string;
      fullName?: string;
      provider?: "github" | "gitlab";
      defaultBranch?: string;
      htmlUrl?: string;
      avatarColor?: string;
    };
    if (!fullName?.trim()) return res.status(400).json({ error: "fullName is required" });

    const resolvedName = name?.trim() || fullName.split("/").pop()!.replace(/\.git$/, "");

    const [created] = await db
      .insert(repositories)
      .values({
        workspaceId,
        ownerId: req.userId!,
        name: resolvedName,
        fullName: fullName.trim().replace(/\.git$/, ""),
        provider: provider === "gitlab" ? "gitlab" : "github",
        defaultBranch: defaultBranch?.trim() || "main",
        htmlUrl: htmlUrl?.trim() || `https://github.com/${fullName.trim()}`,
        avatarColor: avatarColor?.trim() || "#3a93b1",
      })
      .returning();

    // Kick off continuous indexing (RAG repository memory) in the background.
    const [owner, repoName] = created.fullName.split("/");
    if (owner && repoName) indexRepository(owner, repoName).catch(() => {});

    res.status(201).json({ repository: created });
  } catch (err) {
    console.error("[repositories.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/workspaces/:id/repositories — list repositories in a workspace
repositoriesRouter.get("/workspaces/:id/repositories", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(repositories)
      .where(eq(repositories.workspaceId, req.params.id as string));
    res.json({ repositories: list });
  } catch (err) {
    console.error("[repositories.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/repositories/:id — single repository
repositoriesRouter.get("/repositories/:id", async (req: AuthedRequest, res) => {
  try {
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, req.params.id as string));
    if (!repo) return res.status(404).json({ error: "Repository not found" });
    res.json({ repository: repo });
  } catch (err) {
    console.error("[repositories.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/workspaces/:id/repositories/reorder — persist sidebar order
repositoriesRouter.post("/workspaces/:id/repositories/reorder", async (req: AuthedRequest, res) => {
  try {
    const { orderedIds } = req.body as { orderedIds?: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds is required" });
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(repositories).set({ orderIndex: index, updatedAt: new Date() }).where(eq(repositories.id, id)),
      ),
    );
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error("[repositories.reorder]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/repositories/:id
repositoriesRouter.delete("/repositories/:id", async (req: AuthedRequest, res) => {
  try {
    const [deleted] = await db
      .delete(repositories)
      .where(eq(repositories.id, req.params.id as string))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Repository not found" });
    res.json({ message: "Repository deleted" });
  } catch (err) {
    console.error("[repositories.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
