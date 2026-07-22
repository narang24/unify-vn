import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { workItems } from "../../../../src/db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const workItemsRouter = Router();

workItemsRouter.use(requireAuth);

const VALID_TYPES = new Set(["epic", "story", "task", "subtask", "bug"]);
const VALID_STATUSES = new Set(["todo", "inprogress", "inreview", "done"]);

workItemsRouter.post("/spaces/:id/work_items", async (req, res) => {
  try {
    const spaceId = req.params.id;
    const { title, type, status, dueDate, parentId, sprintId } = req.body as {
      title?: string;
      type?: string;
      status?: string;
      dueDate?: string;
      parentId?: string;
      sprintId?: string;
    };
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });

    const resolvedType = VALID_TYPES.has(type ?? "") ? (type as (typeof VALID_TYPES extends Set<infer T> ? T : never)) : "task";
    const resolvedStatus = VALID_STATUSES.has(status ?? "") ? status! : "todo";

    // Subtasks must belong to a parent work item.
    if (resolvedType === "subtask" && !parentId) {
      return res.status(400).json({ error: "Subtasks require a parentId" });
    }

    const [created] = await db
      .insert(workItems)
      .values({
        title: title.trim(),
        type: resolvedType as never,
        status: resolvedStatus,
        spaceId,
        parentId: parentId ?? null,
        sprintId: sprintId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();
    res.status(201).json({ workItem: created });
  } catch (err) {
    console.error("[work_items.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

workItemsRouter.get("/spaces/:id/work_items", async (req, res) => {
  try {
    const list = await db.select().from(workItems).where(eq(workItems.spaceId, req.params.id));
    res.json({ workItems: list });
  } catch (err) {
    console.error("[work_items.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

workItemsRouter.patch("/work_items/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body as {
      title?: string;
      status?: string;
      assigneeId?: string;
      dueDate?: string;
      sprintId?: string | null;
    };
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title) set.title = updates.title;
    if (updates.status && VALID_STATUSES.has(updates.status)) set.status = updates.status;
    if (updates.assigneeId) set.assigneeId = updates.assigneeId;
    if (updates.dueDate) set.dueDate = new Date(updates.dueDate);
    if (updates.sprintId !== undefined) set.sprintId = updates.sprintId;

    const [updated] = await db.update(workItems).set(set).where(eq(workItems.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Work item not found" });
    res.json({ workItem: updated });
  } catch (err) {
    console.error("[work_items.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

workItemsRouter.delete("/work_items/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(workItems).where(eq(workItems.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ error: "Work item not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("[work_items.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
