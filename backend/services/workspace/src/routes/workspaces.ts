import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { workspaces } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const workspacesRouter = Router();

workspacesRouter.use(requireAuth);

// POST /api/v1/workspaces — create workspace
workspacesRouter.post("/workspaces", async (req: AuthedRequest, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const [created] = await db
      .insert(workspaces)
      .values({ name: name.trim(), ownerId: req.userId! })
      .returning();

    res.status(201).json({ workspace: created });
  } catch (err) {
    console.error("[workspaces.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/workspaces — list all workspaces owned by current user
workspacesRouter.get("/workspaces", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, req.userId!));

    res.json({ workspaces: list });
  } catch (err) {
    console.error("[workspaces.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/workspaces/:id — get a single workspace
workspacesRouter.get("/workspaces/:id", async (req: AuthedRequest, res) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, req.params.id as string));

    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    if (workspace.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    res.json({ workspace });
  } catch (err) {
    console.error("[workspaces.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/workspaces/:id — rename workspace
workspacesRouter.patch("/workspaces/:id", async (req: AuthedRequest, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, req.params.id as string));

    if (!existing) return res.status(404).json({ error: "Workspace not found" });
    if (existing.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [updated] = await db
      .update(workspaces)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(workspaces.id, req.params.id as string))
      .returning();

    res.json({ workspace: updated });
  } catch (err) {
    console.error("[workspaces.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/workspaces/:id — delete workspace
workspacesRouter.delete("/workspaces/:id", async (req: AuthedRequest, res) => {
  try {
    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, req.params.id as string));

    if (!existing) return res.status(404).json({ error: "Workspace not found" });
    if (existing.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(workspaces).where(eq(workspaces.id, req.params.id as string));
    res.json({ message: "Workspace deleted" });
  } catch (err) {
    console.error("[workspaces.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
