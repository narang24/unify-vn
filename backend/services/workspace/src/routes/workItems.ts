import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { workItems } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const workItemsRouter = Router();

workItemsRouter.use(requireAuth);

const VALID_TYPES = new Set(["epic", "story", "task", "subtask", "bug"]);
const VALID_STATUSES = new Set(["todo", "inprogress", "inreview", "done"]);

// POST /api/v1/spaces/:id/work_items — create a work item in a space
workItemsRouter.post("/spaces/:id/work_items", async (req: AuthedRequest, res) => {
  try {
    const spaceId = req.params.id as string;
    const {
      title,
      type,
      status,
      dueDate,
      parentId,
      sprintId,
      orderIndex,
    } = req.body as {
      title?: string;
      type?: string;
      status?: string;
      dueDate?: string;
      parentId?: string;
      sprintId?: string;
      orderIndex?: number;
    };

    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });

    const resolvedType = VALID_TYPES.has(type ?? "") ? (type as "epic" | "story" | "task" | "subtask" | "bug") : "task";
    const resolvedStatus = VALID_STATUSES.has(status ?? "") ? status! : "todo";

    // Subtasks must belong to a parent work item
    if (resolvedType === "subtask" && !parentId) {
      return res.status(400).json({ error: "Subtasks require a parentId" });
    }

    const [created] = await db
      .insert(workItems)
      .values({
        title: title.trim(),
        type: resolvedType,
        status: resolvedStatus,
        spaceId,
        parentId: parentId ?? null,
        sprintId: sprintId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        orderIndex: orderIndex ?? 0,
      })
      .returning();

    res.status(201).json({ workItem: created });
  } catch (err) {
    console.error("[work_items.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/spaces/:id/work_items — list all work items in a space
workItemsRouter.get("/spaces/:id/work_items", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(workItems)
      .where(eq(workItems.spaceId, req.params.id as string));

    res.json({ workItems: list });
  } catch (err) {
    console.error("[work_items.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/work_items/:id — get a single work item
workItemsRouter.get("/work_items/:id", async (req: AuthedRequest, res) => {
  try {
    const [item] = await db.select().from(workItems).where(eq(workItems.id, req.params.id as string));
    if (!item) return res.status(404).json({ error: "Work item not found" });

    res.json({ workItem: item });
  } catch (err) {
    console.error("[work_items.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/work_items/:id — update a work item
workItemsRouter.patch("/work_items/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body as {
      title?: string;
      status?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
      sprintId?: string | null;
      parentId?: string | null;
      orderIndex?: number;
    };

    const set: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.title?.trim()) set.title = updates.title.trim();
    if (updates.status && VALID_STATUSES.has(updates.status)) set.status = updates.status;
    if (updates.assigneeId !== undefined) set.assigneeId = updates.assigneeId;
    if (updates.dueDate !== undefined) set.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.sprintId !== undefined) set.sprintId = updates.sprintId;
    if (updates.parentId !== undefined) set.parentId = updates.parentId;
    if (updates.orderIndex !== undefined) set.orderIndex = updates.orderIndex;

    const [updated] = await db
      .update(workItems)
      .set(set)
      .where(eq(workItems.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Work item not found" });
    res.json({ workItem: updated });
  } catch (err) {
    console.error("[work_items.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/work_items/:id — delete a work item (and its subtasks via cascade)
workItemsRouter.delete("/work_items/:id", async (req: AuthedRequest, res) => {
  try {
    const [deleted] = await db
      .delete(workItems)
      .where(eq(workItems.id, req.params.id as string))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Work item not found" });
    res.json({ message: "Work item deleted" });
  } catch (err) {
    console.error("[work_items.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
