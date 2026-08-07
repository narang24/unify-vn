/**
 * Real-time hub for the workspace service, built on Socket.IO.
 *
 * Every connected user's socket joins a room named after their user id.
 * Broadcasting is just `io.to(room).emit(...)` — Socket.IO's own Redis
 * adapter (@socket.io/redis-adapter) is what makes that work correctly
 * across multiple workspace-service replicas: when it's attached, emitting
 * on instance A also reaches a user's socket connected to instance B.
 *
 * Same graceful-degrade philosophy as src/lib/redis.ts: if Redis isn't
 * configured or isn't reachable, the adapter is simply never attached and
 * Socket.IO runs in single-instance mode — broadcasts still work perfectly
 * for everyone connected to that one instance, which is all a single Render
 * service needs.
 */

import type http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../../../src/config/env.js";

const SOCKET_PATH = `${env.apiPrefix}/socket.io`;

export interface RealtimeEvent {
  type: string;
  payload: unknown;
}

let io: SocketIOServer | null = null;

function roomFor(userId: string): string {
  return `user:${userId}`;
}

async function attachRedisAdapter(server_io: SocketIOServer): Promise<void> {
  try {
    const redisPkg = "ioredis";
    const adapterPkg = "@socket.io/redis-adapter";
    const [{ default: Redis }, { createAdapter }] = await Promise.all([
      import(redisPkg) as Promise<any>,
      import(adapterPkg) as Promise<any>,
    ]);

    const pubClient = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    const subClient = pubClient.duplicate();
    pubClient.on("error", () => {});
    subClient.on("error", () => {});
    await Promise.all([pubClient.connect(), subClient.connect()]);

    server_io.adapter(createAdapter(pubClient, subClient));
    console.log("✓ Realtime hub using Redis adapter (multi-instance ready)");
  } catch {
    console.warn("⚠ Realtime hub running single-instance — Redis adapter unavailable");
  }
}

/** Attach the real-time Socket.IO server to the same HTTP server Express is already listening on. */
export async function attachRealtime(server: http.Server): Promise<void> {
  io = new SocketIOServer(server, {
    path: SOCKET_PATH,
    cors: {
      origin: (origin, callback) => {
        if (env.nodeEnv === "development") {
          if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
        }
        if (!origin || origin === env.frontendUrl) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  await attachRedisAdapter(io);

  // Auth handshake — same JWT used by requireAuth, passed explicitly by the
  // client (see frontend/src/lib/realtime.ts) rather than relying on cookies,
  // since the gateway/frontend are on different origins in production.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("Missing token");
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    socket.join(roomFor(userId));
  });

  console.log(`✓ Realtime Socket.IO server attached at ${SOCKET_PATH}`);
}

/** Broadcast a real-time event to a set of users, across every connected service instance. */
export function broadcastToUsers(userIds: string[], event: RealtimeEvent): void {
  if (!io) return;
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  uniqueIds.forEach((id) => io!.to(roomFor(id)).emit("realtime", event));
}
