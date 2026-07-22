import express from "express";
import { env } from "../../../src/config/env.js";
import { db } from "../../../src/db/index.js";
import { workspaces, spaces, workItems } from "../../../src/db/schema.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());

function getUserIdFromReq(req: express.Request): string | null {
  try {
    const token = req.cookies?.auth_token ?? req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const jwt = (await import("jsonwebtoken")).default;
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

app.post(`${env.apiPrefix}/workspaces`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [created] = await db.insert(workspaces).values({ name, ownerId: userId }).returning();
    res.status(201).json({ workspace: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(`${env.apiPrefix}/workspaces`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const list = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId));
    res.json({ workspaces: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(`${env.apiPrefix}/workspaces/:id/spaces`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const workspaceId = req.params.id;
    const [owner] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (!owner || owner.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    const { name, kind } = req.body as { name?: string; kind?: string };
    if (!name) return res.status(400).json({ error: "Name is required" });
    const [created] = await db.insert(spaces).values({ name, workspaceId, kind: kind ?? "kanban" }).returning();
    res.status(201).json({ space: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(`${env.apiPrefix}/workspaces/:id/spaces`, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const list = await db.select().from(spaces).where(eq(spaces.workspaceId, workspaceId));
    res.json({ spaces: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post(`${env.apiPrefix}/spaces/:id/work_items`, async (req, res) => {
  try {
    const spaceId = req.params.id;
    const { title, type, status, dueDate } = req.body as { title?: string; type?: string; status?: string; dueDate?: string };
    if (!title) return res.status(400).json({ error: "Title is required" });
    const [created] = await db.insert(workItems).values({ title, type: type ?? "task", status: status ?? "todo", spaceId, dueDate: dueDate ? new Date(dueDate) : null }).returning();
    res.status(201).json({ workItem: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(`${env.apiPrefix}/spaces/:id/work_items`, async (req, res) => {
  try {
    const spaceId = req.params.id;
    const list = await db.select().from(workItems).where(eq(workItems.spaceId, spaceId));
    res.json({ workItems: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch(`${env.apiPrefix}/work_items/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body as { title?: string; status?: string; assigneeId?: string; dueDate?: string };
    const set: any = {};
    if (updates.title) set.title = updates.title;
    if (updates.status) set.status = updates.status;
    if (updates.assigneeId) set.assigneeId = updates.assigneeId;
    if (updates.dueDate) set.dueDate = new Date(updates.dueDate);
    const [updated] = await db.update(workItems).set(set).where(eq(workItems.id, id)).returning();
    res.json({ workItem: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (_req, res) => res.json({ service: "workspace", status: "ok" }));

app.listen(env.port + 1, () => {
  console.log(`Workspace service listening on http://localhost:${env.port + 1}`);
});
