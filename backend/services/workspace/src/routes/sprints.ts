import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { sprints, workItems } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const sprintsRouter = Router();

sprintsRouter.use(requireAuth);

// POST /api/v1/spaces/:id/sprints — create a sprint in a space
sprintsRouter.post("/spaces/:id/sprints", async (req: AuthedRequest, res) => {
  try {
    const { name, startDate, endDate } = req.body as {
      name?: string;
      startDate?: string;
      endDate?: string;
    };

    const [created] = await db
      .insert(sprints)
      .values({
        spaceId: req.params.id as string,
        name: name?.trim() || "Sprint 1",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      .returning();

    res.status(201).json({ sprint: created });
  } catch (err) {
    console.error("[sprints.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/spaces/:id/sprints — list all sprints in a space
sprintsRouter.get("/spaces/:id/sprints", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(sprints)
      .where(eq(sprints.spaceId, req.params.id as string));

    res.json({ sprints: list });
  } catch (err) {
    console.error("[sprints.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/sprints/:id — get a single sprint
sprintsRouter.get("/sprints/:id", async (req: AuthedRequest, res) => {
  try {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, req.params.id as string));
    if (!sprint) return res.status(404).json({ error: "Sprint not found" });

    res.json({ sprint });
  } catch (err) {
    console.error("[sprints.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/sprints/:id/start — start a sprint
sprintsRouter.post("/sprints/:id/start", async (req: AuthedRequest, res) => {
  try {
    const [updated] = await db
      .update(sprints)
      .set({ status: "active", startDate: new Date() })
      .where(eq(sprints.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Sprint not found" });
    res.json({ sprint: updated });
  } catch (err) {
    console.error("[sprints.start]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/sprints/:id/complete — complete a sprint, move unfinished items to backlog
sprintsRouter.post("/sprints/:id/complete", async (req: AuthedRequest, res) => {
  try {
    const [updated] = await db
      .update(sprints)
      .set({ status: "completed", endDate: new Date() })
      .where(eq(sprints.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Sprint not found" });

    // Move any unfinished items back to the backlog (sprintId = null)
    await db
      .update(workItems)
      .set({ sprintId: null, updatedAt: new Date() })
      .where(eq(workItems.sprintId, req.params.id as string));

    res.json({ sprint: updated });
  } catch (err) {
    console.error("[sprints.complete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/sprints/:id — update sprint name/dates
sprintsRouter.patch("/sprints/:id", async (req: AuthedRequest, res) => {
  try {
    const { name, startDate, endDate } = req.body as {
      name?: string;
      startDate?: string;
      endDate?: string;
    };

    const set: Record<string, unknown> = {};
    if (name?.trim()) set.name = name.trim();
    if (startDate) set.startDate = new Date(startDate);
    if (endDate) set.endDate = new Date(endDate);

    const [updated] = await db
      .update(sprints)
      .set(set)
      .where(eq(sprints.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Sprint not found" });
    res.json({ sprint: updated });
  } catch (err) {
    console.error("[sprints.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/sprints/:id — delete a sprint
sprintsRouter.delete("/sprints/:id", async (req: AuthedRequest, res) => {
  try {
    const [deleted] = await db
      .delete(sprints)
      .where(eq(sprints.id, req.params.id as string))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Sprint not found" });
    res.json({ message: "Sprint deleted" });
  } catch (err) {
    console.error("[sprints.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
