import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { sprints, workItems } from "../../../../src/db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const sprintsRouter = Router();

sprintsRouter.use(requireAuth);

sprintsRouter.post("/spaces/:id/sprints", async (req, res) => {
  try {
    const { name } = req.body as { name?: string };
    const [created] = await db
      .insert(sprints)
      .values({ spaceId: req.params.id, name: name?.trim() || "Sprint 1" })
      .returning();
    res.status(201).json({ sprint: created });
  } catch (err) {
    console.error("[sprints.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

sprintsRouter.get("/spaces/:id/sprints", async (req, res) => {
  try {
    const list = await db.select().from(sprints).where(eq(sprints.spaceId, req.params.id));
    res.json({ sprints: list });
  } catch (err) {
    console.error("[sprints.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

sprintsRouter.post("/sprints/:id/start", async (req, res) => {
  try {
    const [updated] = await db
      .update(sprints)
      .set({ status: "active", startDate: new Date() })
      .where(eq(sprints.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Sprint not found" });
    res.json({ sprint: updated });
  } catch (err) {
    console.error("[sprints.start]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

sprintsRouter.post("/sprints/:id/complete", async (req, res) => {
  try {
    const [updated] = await db
      .update(sprints)
      .set({ status: "completed", endDate: new Date() })
      .where(eq(sprints.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Sprint not found" });

    // Move any unfinished items back to the backlog (sprintId = null).
    await db
      .update(workItems)
      .set({ sprintId: null })
      .where(eq(workItems.sprintId, req.params.id));

    res.json({ sprint: updated });
  } catch (err) {
    console.error("[sprints.complete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
