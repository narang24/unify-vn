import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { workspaces } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const workspacesRouter = Router();

workspacesRouter.use(requireAuth);

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

workspacesRouter.get("/workspaces", async (req: AuthedRequest, res) => {
  try {
    const list = await db.select().from(workspaces).where(eq(workspaces.ownerId, req.userId!));
    res.json({ workspaces: list });
  } catch (err) {
    console.error("[workspaces.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
