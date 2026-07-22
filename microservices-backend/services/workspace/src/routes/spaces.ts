import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { spaces, workspaces } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const spacesRouter = Router();

spacesRouter.use(requireAuth);

const VALID_KINDS = new Set(["kanban", "scrum"]);

spacesRouter.post("/workspaces/:id/spaces", async (req: AuthedRequest, res) => {
  try {
    const workspaceId = req.params.id;
    const [owner] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (!owner || owner.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const { name, kind } = req.body as { name?: string; kind?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    const resolvedKind = VALID_KINDS.has(kind ?? "") ? (kind as "kanban" | "scrum") : "kanban";

    const [created] = await db
      .insert(spaces)
      .values({ name: name.trim(), workspaceId, kind: resolvedKind })
      .returning();
    res.status(201).json({ space: created });
  } catch (err) {
    console.error("[spaces.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

spacesRouter.get("/workspaces/:id/spaces", async (req, res) => {
  try {
    const list = await db.select().from(spaces).where(eq(spaces.workspaceId, req.params.id));
    res.json({ spaces: list });
  } catch (err) {
    console.error("[spaces.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
