import { Router } from "express";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import {
  notifications,
  spaces,
  teamMembers,
  teamSpaces,
  teams,
  users,
  type TeamMember,
} from "../../../../src/db/schema.js";
import { env } from "../../../../src/config/env.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getJSON, setJSON } from "../../../../src/lib/redis.js";
import { sendInvitationEmail } from "../lib/email.js";

export const teamsRouter = Router();
teamsRouter.use(requireAuth);

type Role = "owner" | "admin" | "member";

// ─── Starring (reuses the same Redis-backed prefs mechanism as spaces/repos) ───
// Shared shape with services/workspace/src/routes/prefs.ts — the `starred`
// array just holds ids across entity types (space/repo/team), keyed per user.
interface UserPrefs {
  starred: string[];
  recents: { type: string; id: string; at: number }[];
}
const prefsKey = (userId: string) => `unify:prefs:${userId}`;
async function loadPrefs(userId: string): Promise<UserPrefs> {
  return (await getJSON<UserPrefs>(prefsKey(userId))) ?? { starred: [], recents: [] };
}
async function savePrefs(userId: string, prefs: UserPrefs): Promise<void> {
  await setJSON(prefsKey(userId), prefs, 7 * 24 * 3600);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getTeamOr404(teamId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  return team ?? null;
}

async function getMembership(teamId: string, userId: string): Promise<TeamMember | null> {
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId), eq(teamMembers.status, "active")));
  return row ?? null;
}

function isMember(team: { ownerId: string }, membership: TeamMember | null, userId: string): boolean {
  return team.ownerId === userId || membership !== null;
}

function isOwnerOrAdmin(team: { ownerId: string }, membership: TeamMember | null, userId: string): boolean {
  if (team.ownerId === userId) return true;
  return !!membership && (membership.role === "owner" || membership.role === "admin");
}

async function buildTeamPayload(team: typeof teams.$inferSelect, starredIds: Set<string>) {
  const [owner] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, team.ownerId));

  const memberRows = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      status: teamMembers.status,
      invitedEmail: teamMembers.invitedEmail,
      createdAt: teamMembers.createdAt,
      userFullName: users.fullName,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(teamMembers)
    .leftJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, team.id));

  const activeMembers = memberRows.filter((m) => m.status === "active");

  const relatedSpaceLinks = await db
    .select({ spaceId: teamSpaces.spaceId, name: spaces.name, kind: spaces.kind })
    .from(teamSpaces)
    .innerJoin(spaces, eq(spaces.id, teamSpaces.spaceId))
    .where(eq(teamSpaces.teamId, team.id));

  return {
    ...team,
    owner,
    memberCount: activeMembers.length,
    avatars: activeMembers.slice(0, 5).map((m) => ({
      userId: m.userId,
      fullName: m.userFullName,
      avatarUrl: m.userAvatarUrl,
    })),
    members: memberRows,
    relatedSpaces: relatedSpaceLinks.map((l) => ({ id: l.spaceId, name: l.name, kind: l.kind })),
    starred: starredIds.has(team.id),
  };
}

// ─── Team CRUD ──────────────────────────────────────────────────────────────

// GET /api/v1/teams — list teams the current user owns or is an active member of
teamsRouter.get("/teams", async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;

    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")));
    const memberTeamIds = memberships.map((m) => m.teamId);

    const list = await db
      .select()
      .from(teams)
      .where(
        memberTeamIds.length
          ? or(eq(teams.ownerId, userId), inArray(teams.id, memberTeamIds))
          : eq(teams.ownerId, userId),
      )
      .orderBy(desc(teams.createdAt));

    const prefs = await loadPrefs(userId);
    const starredIds = new Set(prefs.starred);

    const payload = await Promise.all(list.map((t) => buildTeamPayload(t, starredIds)));
    res.json({ teams: payload });
  } catch (err) {
    console.error("[teams.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/teams/:id — get a single team
teamsRouter.get("/teams/:id", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isMember(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const prefs = await loadPrefs(req.userId!);
    res.json({ team: await buildTeamPayload(team, new Set(prefs.starred)) });
  } catch (err) {
    console.error("[teams.get]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/teams — create a team { name, description?, spaceIds? }
teamsRouter.post("/teams", async (req: AuthedRequest, res) => {
  try {
    const { name, description, spaceIds } = req.body as {
      name?: string;
      description?: string;
      spaceIds?: string[];
    };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const [created] = await db
      .insert(teams)
      .values({ name: name.trim(), description: description?.trim() || null, ownerId: req.userId! })
      .returning();

    await db.insert(teamMembers).values({
      teamId: created.id,
      userId: req.userId!,
      role: "owner",
      status: "active",
    });

    if (Array.isArray(spaceIds) && spaceIds.length) {
      await db.insert(teamSpaces).values(spaceIds.map((spaceId) => ({ teamId: created.id, spaceId })));
    }

    const prefs = await loadPrefs(req.userId!);
    res.status(201).json({ team: await buildTeamPayload(created, new Set(prefs.starred)) });
  } catch (err) {
    console.error("[teams.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/teams/:id — update name/description/related spaces (owner/admin only)
teamsRouter.patch("/teams/:id", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isOwnerOrAdmin(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const { name, description, spaceIds } = req.body as {
      name?: string;
      description?: string | null;
      spaceIds?: string[];
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const [updated] = await db.update(teams).set(updates).where(eq(teams.id, team.id)).returning();

    if (Array.isArray(spaceIds)) {
      await db.delete(teamSpaces).where(eq(teamSpaces.teamId, team.id));
      if (spaceIds.length) {
        await db.insert(teamSpaces).values(spaceIds.map((spaceId) => ({ teamId: team.id, spaceId })));
      }
    }

    const prefs = await loadPrefs(req.userId!);
    res.json({ team: await buildTeamPayload(updated, new Set(prefs.starred)) });
  } catch (err) {
    console.error("[teams.update]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/teams/:id — delete a team (owner only)
teamsRouter.delete("/teams/:id", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (team.ownerId !== req.userId) return res.status(403).json({ error: "Only the owner can delete a team" });

    await db.delete(teams).where(eq(teams.id, team.id));
    res.json({ message: "Team deleted" });
  } catch (err) {
    console.error("[teams.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/teams/:id/duplicate — clone a team (name, description, related spaces);
// current user becomes the owner of the duplicate.
teamsRouter.post("/teams/:id/duplicate", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isMember(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const [duplicate] = await db
      .insert(teams)
      .values({ name: `${team.name} (Copy)`, description: team.description, ownerId: req.userId! })
      .returning();

    await db.insert(teamMembers).values({
      teamId: duplicate.id,
      userId: req.userId!,
      role: "owner",
      status: "active",
    });

    const relatedSpaceLinks = await db.select().from(teamSpaces).where(eq(teamSpaces.teamId, team.id));
    if (relatedSpaceLinks.length) {
      await db
        .insert(teamSpaces)
        .values(relatedSpaceLinks.map((l) => ({ teamId: duplicate.id, spaceId: l.spaceId })));
    }

    const prefs = await loadPrefs(req.userId!);
    res.status(201).json({ team: await buildTeamPayload(duplicate, new Set(prefs.starred)) });
  } catch (err) {
    console.error("[teams.duplicate]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/teams/:id/star — toggle starred state for the current user
teamsRouter.post("/teams/:id/star", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isMember(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const prefs = await loadPrefs(req.userId!);
    const starred = prefs.starred.includes(team.id);
    prefs.starred = starred ? prefs.starred.filter((id) => id !== team.id) : [team.id, ...prefs.starred];
    await savePrefs(req.userId!, prefs);

    res.json({ starred: !starred });
  } catch (err) {
    console.error("[teams.star]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Team Members ───────────────────────────────────────────────────────────

// GET /api/v1/teams/:id/members
teamsRouter.get("/teams/:id/members", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isMember(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const list = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        status: teamMembers.status,
        invitedEmail: teamMembers.invitedEmail,
        createdAt: teamMembers.createdAt,
        userFullName: users.fullName,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
      })
      .from(teamMembers)
      .leftJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, team.id));

    res.json({ members: list });
  } catch (err) {
    console.error("[teams.members.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/teams/:id/members — { userId?, email?, role? }
// Adds an existing user directly (notifies them), or invites a non-existing
// user by email (pending row + invitation email).
teamsRouter.post("/teams/:id/members", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isOwnerOrAdmin(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const { userId, email, role } = req.body as { userId?: string; email?: string; role?: Role };
    const resolvedRole: Role = role && ["owner", "admin", "member"].includes(role) ? role : "member";

    if (!userId && !email?.trim()) {
      return res.status(400).json({ error: "userId or email is required" });
    }

    const [inviter] = await db.select().from(users).where(eq(users.id, req.userId!));

    let targetUser: typeof users.$inferSelect | undefined;
    if (userId) {
      [targetUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!targetUser) return res.status(404).json({ error: "User not found" });
    } else if (email?.trim()) {
      [targetUser] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    }

    // Already a member?
    if (targetUser) {
      const [existing] = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, targetUser.id)));
      if (existing) return res.status(409).json({ error: "Already a member" });
    }

    if (targetUser) {
      // Existing user — add directly as an active member and notify them.
      const [created] = await db
        .insert(teamMembers)
        .values({
          teamId: team.id,
          userId: targetUser.id,
          role: resolvedRole,
          status: "active",
          invitedBy: req.userId!,
        })
        .returning();

      await db.insert(notifications).values({
        userId: targetUser.id,
        type: "added_to_team",
        title: "You were added to a team",
        body: `${inviter?.fullName ?? inviter?.email ?? "Someone"} added you to the team "${team.name}".`,
        entityType: "team",
        entityId: team.id,
      });

      return res.status(201).json({ member: created });
    }

    // Non-existing user — create a pending invite row and email them.
    const normalizedEmail = email!.trim().toLowerCase();

    const [existingInvite] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.invitedEmail, normalizedEmail)));
    if (existingInvite) return res.status(409).json({ error: "Already invited" });

    const [created] = await db
      .insert(teamMembers)
      .values({
        teamId: team.id,
        userId: null,
        role: resolvedRole,
        status: "pending",
        invitedEmail: normalizedEmail,
        invitedBy: req.userId!,
      })
      .returning();

    const inviteUrl = `${env.frontendUrl}/invite?team=${team.id}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendInvitationEmail({
      to: normalizedEmail,
      teamName: team.name,
      inviterName: inviter?.fullName ?? inviter?.email ?? "A teammate",
      inviteUrl,
    });

    res.status(201).json({ member: created });
  } catch (err) {
    console.error("[teams.members.add]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/teams/:id/members/:memberId
teamsRouter.delete("/teams/:id/members/:memberId", async (req: AuthedRequest, res) => {
  try {
    const team = await getTeamOr404(req.params.id as string);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const membership = await getMembership(team.id, req.userId!);
    if (!isOwnerOrAdmin(team, membership, req.userId!)) return res.status(403).json({ error: "Forbidden" });

    const [target] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, req.params.memberId as string), eq(teamMembers.teamId, team.id)));
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ error: "Cannot remove the team owner" });
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, target.id));
    res.json({ message: "Member removed" });
  } catch (err) {
    console.error("[teams.members.remove]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
