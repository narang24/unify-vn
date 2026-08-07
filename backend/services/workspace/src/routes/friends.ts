import { Router } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { friendRequests, friendships, notifications, users } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { broadcastToUsers } from "../ws/realtime.js";

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

// ─── Helpers ────────────────────────────────────────────────────────────────

const userCols = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  avatarUrl: users.avatarUrl,
};

/** Friendships are stored with the lexicographically-smaller id first. */
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function findFriendship(userId: string, otherId: string) {
  const [a, b] = orderPair(userId, otherId);
  const [row] = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.userAId, a), eq(friendships.userBId, b)));
  return row ?? null;
}

async function findActiveRequest(senderId: string, receiverId: string) {
  const [row] = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.senderId, senderId),
        eq(friendRequests.receiverId, receiverId),
        eq(friendRequests.status, "pending"),
      ),
    );
  return row ?? null;
}

// ─── GET /friends — current user's friends list ─────────────────────────────

friendsRouter.get("/friends", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const rows = await db
      .select()
      .from(friendships)
      .where(or(eq(friendships.userAId, me), eq(friendships.userBId, me)));

    const friends = await Promise.all(
      rows.map(async (f) => {
        const otherId = f.userAId === me ? f.userBId : f.userAId;
        const [u] = await db.select(userCols).from(users).where(eq(users.id, otherId));
        return u ? { friendshipId: f.id, ...u, since: f.createdAt } : null;
      }),
    );

    res.json({ friends: friends.filter(Boolean) });
  } catch (err) {
    console.error("[friends.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /friends/requests — { received, sent } ──────────────────────────────
// received: pending requests addressed to me.
// sent: requests I sent that are still pending or were declined (so the
// sender can see the outcome); accepted ones disappear into /friends instead.

friendsRouter.get("/friends/requests", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;

    const receivedRows = await db
      .select({
        id: friendRequests.id,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        user: userCols,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.senderId))
      .where(and(eq(friendRequests.receiverId, me), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt));

    const sentRows = await db
      .select({
        id: friendRequests.id,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        user: userCols,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.receiverId))
      .where(eq(friendRequests.senderId, me))
      .orderBy(desc(friendRequests.createdAt));

    res.json({ received: receivedRows, sent: sentRows });
  } catch (err) {
    console.error("[friends.requests.list]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /friends/requests { receiverId } — send a friend request ──────────

friendsRouter.post("/friends/requests", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const { receiverId } = req.body as { receiverId?: string };
    if (!receiverId?.trim()) return res.status(400).json({ error: "receiverId is required" });
    if (receiverId === me) return res.status(400).json({ error: "You can't friend yourself" });

    const [receiver] = await db.select(userCols).from(users).where(eq(users.id, receiverId));
    if (!receiver) return res.status(404).json({ error: "User not found" });

    if (await findFriendship(me, receiverId)) {
      return res.status(409).json({ error: "Already friends" });
    }
    if ((await findActiveRequest(me, receiverId)) || (await findActiveRequest(receiverId, me))) {
      return res.status(409).json({ error: "A request already exists between you two" });
    }

    const [created] = await db
      .insert(friendRequests)
      .values({ senderId: me, receiverId, status: "pending" })
      .returning();

    const [sender] = await db.select(userCols).from(users).where(eq(users.id, me));
    await db.insert(notifications).values({
      userId: receiverId,
      type: "friend_request",
      title: "New friend request",
      body: `${sender?.fullName ?? sender?.email ?? "Someone"} sent you a friend request.`,
      entityType: "friend_request",
      entityId: created.id,
    });

    // Real-time push — payload differs per side, so this is two targeted
    // broadcasts rather than one shared one (the receiver needs the
    // sender's profile embedded, and vice versa).
    const requestBase = { id: created.id, status: created.status, createdAt: created.createdAt };
    await Promise.all([
      broadcastToUsers([receiverId], {
        type: "friend_request:new",
        payload: { request: { ...requestBase, user: sender }, direction: "received" },
      }),
      broadcastToUsers([me], {
        type: "friend_request:new",
        payload: { request: { ...requestBase, user: receiver }, direction: "sent" },
      }),
    ]);

    res.status(201).json({ request: { ...created, user: sender } });
  } catch (err) {
    console.error("[friends.requests.create]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /friends/requests/:id/accept ───────────────────────────────────────

friendsRouter.post("/friends/requests/:id/accept", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, req.params.id as string));
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.receiverId !== me) return res.status(403).json({ error: "Not your request to accept" });
    if (request.status !== "pending") return res.status(409).json({ error: "Request is no longer pending" });

    const [a, b] = orderPair(request.senderId, request.receiverId);
    const [friendship] = await db.insert(friendships).values({ userAId: a, userBId: b }).returning();
    await db.delete(friendRequests).where(eq(friendRequests.id, request.id));

    const [me_] = await db.select(userCols).from(users).where(eq(users.id, me));
    const [requester] = await db.select(userCols).from(users).where(eq(users.id, request.senderId));
    await db.insert(notifications).values({
      userId: request.senderId,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      body: `${me_?.fullName ?? me_?.email ?? "Someone"} accepted your friend request.`,
      entityType: "friendship",
      entityId: friendship.id,
    });

    // Real-time push — each side gets the OTHER person shaped as an ApiFriend
    // entry, ready to prepend straight into their friends list.
    await Promise.all([
      broadcastToUsers([request.senderId], {
        type: "friend_request:accepted",
        payload: {
          requestId: request.id,
          friend: { friendshipId: friendship.id, ...me_, since: friendship.createdAt },
        },
      }),
      broadcastToUsers([me], {
        type: "friend_request:accepted",
        payload: {
          requestId: request.id,
          friend: { friendshipId: friendship.id, ...requester, since: friendship.createdAt },
        },
      }),
    ]);

    res.json({ friendship });
  } catch (err) {
    console.error("[friends.requests.accept]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /friends/requests/:id/decline ──────────────────────────────────────

friendsRouter.post("/friends/requests/:id/decline", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, req.params.id as string));
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.receiverId !== me) return res.status(403).json({ error: "Not your request to decline" });
    if (request.status !== "pending") return res.status(409).json({ error: "Request is no longer pending" });

    const [updated] = await db
      .update(friendRequests)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(friendRequests.id, request.id))
      .returning();

    // One shared payload works for both sides: the receiver's client drops
    // it from `received`, the sender's client flips their `sent` entry's
    // status — each client only applies the branch that matches what it has.
    await broadcastToUsers([request.senderId, request.receiverId], {
      type: "friend_request:declined",
      payload: { requestId: request.id, status: "declined" },
    });

    res.json({ request: updated });
  } catch (err) {
    console.error("[friends.requests.decline]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /friends/requests/:id — cancel a sent request or dismiss a declined one ───

friendsRouter.delete("/friends/requests/:id", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, req.params.id as string));
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.senderId !== me && request.receiverId !== me) {
      return res.status(403).json({ error: "Not your request" });
    }

    await db.delete(friendRequests).where(eq(friendRequests.id, request.id));

    await broadcastToUsers([request.senderId, request.receiverId], {
      type: "friend_request:cancelled",
      payload: { requestId: request.id },
    });

    res.json({ message: "Request removed" });
  } catch (err) {
    console.error("[friends.requests.delete]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /friends/:friendshipId — unfriend ────────────────────────────────

friendsRouter.delete("/friends/:friendshipId", async (req: AuthedRequest, res) => {
  try {
    const me = req.userId!;
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, req.params.friendshipId as string));
    if (!friendship) return res.status(404).json({ error: "Friendship not found" });
    if (friendship.userAId !== me && friendship.userBId !== me) {
      return res.status(403).json({ error: "Not your friendship" });
    }

    await db.delete(friendships).where(eq(friendships.id, friendship.id));

    await broadcastToUsers([friendship.userAId, friendship.userBId], {
      type: "friendship:removed",
      payload: { friendshipId: friendship.id },
    });

    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error("[friends.remove]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
