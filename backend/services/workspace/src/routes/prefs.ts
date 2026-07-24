import { Router } from "express";
import { getJSON, setJSON } from "../../../../src/lib/redis.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const prefsRouter = Router();
prefsRouter.use(requireAuth);

export type RecentItem = { type: "space" | "repo"; id: string; at: number };
export interface UserPrefs {
  starred: string[]; // space / repo ids
  recents: RecentItem[];
}

const key = (userId: string) => `unify:prefs:${userId}`;
const RECENTS_CAP = 15;

async function load(userId: string): Promise<UserPrefs> {
  return (await getJSON<UserPrefs>(key(userId))) ?? { starred: [], recents: [] };
}
async function save(userId: string, prefs: UserPrefs): Promise<void> {
  // Prefs are UI state — cache in Redis for a week, refreshed on each write.
  await setJSON(key(userId), prefs, 7 * 24 * 3600);
}

// GET /api/v1/prefs
prefsRouter.get("/prefs", async (req: AuthedRequest, res) => {
  res.json({ prefs: await load(req.userId!) });
});

// POST /api/v1/prefs/star { id } — toggle a starred item
prefsRouter.post("/prefs/star", async (req: AuthedRequest, res) => {
  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ error: "id is required" });
  const prefs = await load(req.userId!);
  prefs.starred = prefs.starred.includes(id)
    ? prefs.starred.filter((x) => x !== id)
    : [id, ...prefs.starred];
  await save(req.userId!, prefs);
  res.json({ prefs });
});

// POST /api/v1/prefs/recent { type, id } — record a recently-opened item
prefsRouter.post("/prefs/recent", async (req: AuthedRequest, res) => {
  const { type, id } = req.body as { type?: "space" | "repo"; id?: string };
  if (!type || !id) return res.status(400).json({ error: "type and id are required" });
  const prefs = await load(req.userId!);
  prefs.recents = [{ type, id, at: Date.now() }, ...prefs.recents.filter((r) => r.id !== id)].slice(0, RECENTS_CAP);
  await save(req.userId!, prefs);
  res.json({ prefs });
});
