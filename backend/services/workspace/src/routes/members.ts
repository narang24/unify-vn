import { Router } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { spaceMembers, users } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const membersRouter = Router();
membersRouter.use(requireAuth);

// GET /api/v1/spaces/:id/members
membersRouter.get("/spaces/:id/members", async (req: AuthedRequest, res) => {
    const list = await db.select().from(spaceMembers).where(eq(spaceMembers.spaceId, req.params.id as string));
    res.json({ members: list });
});

// POST /api/v1/spaces/:id/members  { email, role }
membersRouter.post("/spaces/:id/members", async (req: AuthedRequest, res) => {
    const { email, role } = req.body as { email?: string; role?: "viewer" | "editor" | "admin" };
    if (!email?.trim()) return res.status(400).json({ error: "email is required" });
    const spaceId = req.params.id as string;

    const existing = await db.select().from(spaceMembers)
        .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.email, email.toLowerCase())));
    if (existing.length) return res.status(409).json({ error: "Already a member" });

    const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    const [created] = await db.insert(spaceMembers).values({
        spaceId,
        userId: existingUser?.id ?? null,
        email: email.toLowerCase(),
        role: role ?? "editor",
        status: existingUser ? "active" : "pending",
        invitedBy: req.userId!,
    }).returning();

    res.status(201).json({ member: created });
});

// PATCH /api/v1/space-members/:id  { role }
membersRouter.patch("/space-members/:id", async (req: AuthedRequest, res) => {
    const { role } = req.body as { role?: "viewer" | "editor" | "admin" };
    const [updated] = await db.update(spaceMembers).set({ role }).where(eq(spaceMembers.id, req.params.id as string)).returning();
    if (!updated) return res.status(404).json({ error: "Member not found" });
    res.json({ member: updated });
});

// DELETE /api/v1/space-members/:id
membersRouter.delete("/space-members/:id", async (req: AuthedRequest, res) => {
    const [deleted] = await db.delete(spaceMembers).where(eq(spaceMembers.id, req.params.id as string)).returning();
    if (!deleted) return res.status(404).json({ error: "Member not found" });
    res.json({ message: "Member removed" });
});