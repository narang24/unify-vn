import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { notifications } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// GET /api/v1/notifications — list current user's notifications, newest first
notificationsRouter.get("/notifications", async (req: AuthedRequest, res) => {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.userId!))
      .orderBy(desc(notifications.createdAt));

    res.json({ notifications: list, unreadCount: list.filter((n) => !n.read).length });
  } catch (err) {
    console.error("[notifications.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/notifications/:id/read — mark a single notification as read
notificationsRouter.patch("/notifications/:id/read", async (req: AuthedRequest, res) => {
  try {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, req.params.id as string), eq(notifications.userId, req.userId!)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification: updated });
  } catch (err) {
    console.error("[notifications.markRead]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/notifications/read-all — mark all of current user's notifications as read
notificationsRouter.patch("/notifications/read-all", async (req: AuthedRequest, res) => {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, req.userId!), eq(notifications.read, false)));

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("[notifications.markAllRead]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
