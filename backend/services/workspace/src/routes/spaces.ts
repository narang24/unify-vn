import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { spaces, workspaces } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const spacesRouter = Router();

spacesRouter.use(requireAuth);

const VALID_KINDS = new Set(["kanban", "scrum", "bugtracker", "custom"]);
type SpaceKind = "kanban" | "scrum" | "bugtracker" | "custom";

// POST /api/v1/workspaces/:id/spaces — create a space inside a workspace
spacesRouter.post("/workspaces/:id/spaces", async (req: AuthedRequest, res) => {
  try {
    const workspaceId = req.params.id as string;

    const [owner] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (!owner) return res.status(404).json({ error: "Workspace not found" });
    if (owner.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const { name, kind } = req.body as { name?: string; kind?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const resolvedKind = VALID_KINDS.has(kind ?? "") ? (kind as SpaceKind) : "kanban";

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

// POST /api/v1/workspaces/:id/spaces/reorder — persist sidebar order
spacesRouter.post("/workspaces/:id/spaces/reorder", async (req: AuthedRequest, res) => {
  try {
    const { orderedIds } = req.body as { orderedIds?: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds is required" });

    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(spaces).set({ orderIndex: index, updatedAt: new Date() }).where(eq(spaces.id, id)),
      ),
    );
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error("[spaces.reorder]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/workspaces/:id/spaces — list spaces in a workspace
spacesRouter.get("/workspaces/:id/spaces", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(spaces)
      .where(eq(spaces.workspaceId, req.params.id as string));

    res.json({ spaces: list });
  } catch (err) {
    console.error("[spaces.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/spaces/:id — get a single space
spacesRouter.get("/spaces/:id", async (req: AuthedRequest, res) => {
  try {
    const [space] = await db.select().from(spaces).where(eq(spaces.id, req.params.id as string));
    if (!space) return res.status(404).json({ error: "Space not found" });

    res.json({ space });
  } catch (err) {
    console.error("[spaces.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/spaces/:id — update space name/kind/columns/pinned/repository
spacesRouter.patch("/spaces/:id", async (req: AuthedRequest, res) => {
  try {
    const { name, kind, columns, pinned, repositoryId, orderIndex } = req.body as {
      name?: string;
      kind?: string;
      columns?: { id: string; label: string }[];
      pinned?: boolean;
      repositoryId?: string | null;
      orderIndex?: number;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (name?.trim()) updates.name = name.trim();
    if (kind && VALID_KINDS.has(kind)) updates.kind = kind;
    if (Array.isArray(columns)) updates.columns = columns;
    if (typeof pinned === "boolean") updates.pinned = pinned;
    if (repositoryId !== undefined) updates.repositoryId = repositoryId;
    if (typeof orderIndex === "number") updates.orderIndex = orderIndex;

    const [updated] = await db
      .update(spaces)
      .set(updates)
      .where(eq(spaces.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Space not found" });
    res.json({ space: updated });
  } catch (err) {
    console.error("[spaces.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/spaces/:id/columns — add a custom status column
spacesRouter.post("/spaces/:id/columns", async (req: AuthedRequest, res) => {
  try {
    const { label } = req.body as { label?: string };
    if (!label?.trim()) return res.status(400).json({ error: "Label is required" });

    const [space] = await db.select().from(spaces).where(eq(spaces.id, req.params.id as string));
    if (!space) return res.status(404).json({ error: "Space not found" });

    const columns = [...(space.columns ?? []), { id: `col_${Date.now()}`, label: label.trim() }];
    const [updated] = await db
      .update(spaces)
      .set({ columns, updatedAt: new Date() })
      .where(eq(spaces.id, req.params.id as string))
      .returning();

    res.json({ space: updated });
  } catch (err) {
    console.error("[spaces.addColumn]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/spaces/:id — delete space (cascades to work items & sprints)
spacesRouter.delete("/spaces/:id", async (req: AuthedRequest, res) => {
  try {
    const [deleted] = await db
      .delete(spaces)
      .where(eq(spaces.id, req.params.id as string))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Space not found" });
    res.json({ message: "Space deleted" });
  } catch (err) {
    console.error("[spaces.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
