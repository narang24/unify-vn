import { Router } from "express";
import { and, ilike, ne, or } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { users } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const SEARCH_LIMIT = 10;

// GET /api/v1/users/search?q=... — used by "add member" pickers.
// Case-insensitive partial match on name / email / github login, excludes
// sensitive fields (password hash, oauth tokens) and the requesting user.
usersRouter.get("/users/search", async (req: AuthedRequest, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) return res.json({ users: [] });

    const pattern = `%${q}%`;

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        githubLogin: users.githubLogin,
      })
      .from(users)
      .where(
        and(
          ne(users.id, req.userId!),
          or(ilike(users.fullName, pattern), ilike(users.email, pattern), ilike(users.githubLogin, pattern)),
        ),
      )
      .limit(SEARCH_LIMIT);

    res.json({ users: rows });
  } catch (err) {
    console.error("[users.search]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
