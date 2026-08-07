/**
 * Real-time client, built on Socket.IO.
 *
 * Single shared connection to the workspace service's realtime hub
 * (backend/services/workspace/src/ws/realtime.ts). Components subscribe to
 * every incoming event and get pushed updates the moment the server sees a
 * change — no polling required. Socket.IO's client handles reconnection
 * (with backoff) and transport fallback itself; the `auth` callback below
 * re-reads the access token from storage on every (re)connection attempt, so
 * a token refreshed by a normal API call is picked up automatically.
 */

import { io, type Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";

export interface RealtimeEvent<T = unknown> {
  type: string;
  payload: T;
}

type Handler = (event: RealtimeEvent) => void;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const SOCKET_PATH = "/api/v1/socket.io";

const handlers = new Set<Handler>();

let socket: Socket | null = null;
let refCount = 0;

function ensureSocket(): Socket {
  if (socket) return socket;

  const s = io(API_BASE, {
    path: SOCKET_PATH,
    withCredentials: true,
    // Called fresh on every connect/reconnect attempt, so a token refreshed
    // in the meantime (via the normal fetchWithAuth flow) is always used.
    auth: (cb) => cb({ token: getToken() }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  s.on("realtime", (event: RealtimeEvent) => {
    handlers.forEach((fn) => fn(event));
  });

  socket = s;
  return s;
}

/**
 * Ensure the shared connection is alive and register `handler` for every
 * incoming event. Returns an unsubscribe function — call it when the
 * consuming component unmounts / closes. The underlying socket is only
 * disconnected once the last subscriber unsubscribes.
 */
export function subscribeRealtime(handler: Handler): () => void {
  handlers.add(handler);
  refCount += 1;
  ensureSocket();

  return () => {
    handlers.delete(handler);
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
      socket?.disconnect();
      socket = null;
    }
  };
}
