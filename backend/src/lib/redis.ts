/**
 * Redis layer for the Unify backend.
 *
 * Used for caching (GitHub proxy responses, user lookups), session-adjacent
 * data and per-user preferences. Degrades gracefully: if `ioredis` isn't
 * installed or a server isn't reachable, everything falls back to an in-process
 * store so the app still runs. Install `ioredis` + set REDIS_URL in production.
 */

import { env } from "../config/env.js";

// In-memory fallback store.
const mem = new Map<string, { value: string; expiresAt?: number }>();

// `any` because ioredis types may not be installed; the module is loaded lazily.
let client: any | null | undefined; // undefined = not tried yet, null = unavailable
let connecting: Promise<any | null> | null = null;

async function getClient(): Promise<any | null> {
  if (client !== undefined) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      // Non-literal specifier so the bundler/tsc doesn't hard-require the module.
      const pkg = "ioredis";
      const mod: any = await import(pkg);
      const Redis = mod.default ?? mod;
      const c = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      await c.connect();
      client = c;
      console.log("✓ Redis connected");
    } catch {
      client = null;
      console.warn("⚠ Redis unavailable — using in-memory cache fallback");
    }
    return client ?? null;
  })();

  return connecting;
}

export async function cacheGet(key: string): Promise<string | null> {
  const c = await getClient();
  if (c) {
    try {
      return await c.get(key);
    } catch {
      /* fall through to memory */
    }
  }
  const entry = mem.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const c = await getClient();
  if (c) {
    try {
      if (ttlSeconds) await c.set(key, value, "EX", ttlSeconds);
      else await c.set(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  mem.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
}

export async function cacheDel(key: string): Promise<void> {
  const c = await getClient();
  if (c) {
    try {
      await c.del(key);
      return;
    } catch {
      /* fall through */
    }
  }
  mem.delete(key);
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

/**
 * Cache-aside helper: return the cached value or compute + store it.
 */
export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await getJSON<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await setJSON(key, value, ttlSeconds);
  return value;
}
