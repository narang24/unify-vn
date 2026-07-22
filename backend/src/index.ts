import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GitLabStrategy } from "passport-gitlab2";
import { Strategy as GoogleOIDCStrategy } from "passport-google-oidc";
import { eq, and, lt } from "drizzle-orm";

import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { users, refreshTokens, workspaces, spaces, workItems } from "./db/schema.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OAuthProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

// ─── Token Constants ─────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = "15m";               // short-lived
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sign a short-lived access token (15 min). */
function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/** Generate a cryptographically random opaque refresh token + its SHA-256 hash. */
function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/** Persist a refresh token hash in the DB, return the raw token to send to client. */
async function createRefreshTokenForUser(userId: string): Promise<string> {
  const { raw, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await db.insert(refreshTokens).values({ userId, tokenHash: hash, expiresAt });
  return raw;
}

/** Set the refresh token as an HttpOnly cookie. */
function sendRefreshCookie(res: express.Response, rawToken: string) {
  res.cookie("refresh_token", rawToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "strict" : "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/api/v1/auth", // only sent to auth endpoints
  });
}

/** Issue both tokens: access token in JSON body, refresh token as HttpOnly cookie. */
async function issueTokenPair(res: express.Response, userId: string) {
  const accessToken = signAccessToken(userId);
  const rawRefreshToken = await createRefreshTokenForUser(userId);
  sendRefreshCookie(res, rawRefreshToken);
  return accessToken;
}

/** Revoke all refresh tokens for a user (used on sign-out). */
async function revokeAllRefreshTokens(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

/** Revoke a single refresh token by its raw value. */
async function revokeSingleRefreshToken(rawToken: string) {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
}

/** Periodically clean up expired refresh tokens (runs on startup). */
async function cleanupExpiredTokens() {
  const deleted = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()))
    .returning();
  if (deleted.length > 0) {
    console.log(`  Cleaned ${deleted.length} expired refresh token(s)`);
  }
}

/** Find or create an OAuth user, returns the DB user. */
async function upsertOAuthUser(
  provider: "google" | "github" | "gitlab",
  providerAccountId: string,
  email: string,
  fullName?: string,
  avatarUrl?: string,
) {
  // 1. Try by provider + providerAccountId
  const [byProvider] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.authProvider, provider),
        eq(users.providerAccountId, providerAccountId),
      ),
    );
  if (byProvider) return byProvider;

  // 2. Try by email (link existing local account)
  if (email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (byEmail) {
      const [updated] = await db
        .update(users)
        .set({ authProvider: provider, providerAccountId, avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, byEmail.id))
        .returning();
      return updated;
    }
  }

  // 3. Create new user
  const [created] = await db
    .insert(users)
    .values({
      fullName: fullName ?? null,
      email: email.toLowerCase(),
      passwordHash: null,
      authProvider: provider,
      providerAccountId,
      avatarUrl: avatarUrl ?? null,
    })
    .returning();
  return created;
}

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (env.nodeEnv === "development") {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }
      if (origin === env.frontendUrl) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "strict" : "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes — only for OAuth handshake
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Minimal passport serialization (only used during OAuth handshake redirect)
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user ?? null);
  } catch (err) {
    done(err, null);
  }
});

// ─── Google OIDC Strategy ────────────────────────────────────────────────────

passport.use(
  new GoogleOIDCStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: `${env.apiPrefix}/auth/oauth/google/callback`,
      scope: ["openid", "profile", "email"],
      issuer: "https://accounts.google.com",
      authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenURL: "https://oauth2.googleapis.com/token",
      userInfoURL: "https://openidconnect.googleapis.com/v1/userinfo",
    },
    async (issuer: string, profile: any, done: any) => {
      try {
        const email: string =
          profile.emails?.[0]?.value ?? profile.id + "@google.oauth";
        const user = await upsertOAuthUser(
          "google",
          profile.id,
          email,
          profile.displayName,
          profile.photos?.[0]?.value,
        );
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// ─── GitHub OAuth 2.0 Strategy ───────────────────────────────────────────────

passport.use(
  new GitHubStrategy(
    {
      clientID: env.githubClientId,
      clientSecret: env.githubClientSecret,
      callbackURL: `${env.apiPrefix}/auth/oauth/github/callback`,
      scope: ["user:email"],
    },
    async (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: any) => {
      try {
        const email: string =
          profile.emails?.[0]?.value ?? profile.id + "@github.oauth";
        const user = await upsertOAuthUser(
          "github",
          profile.id,
          email,
          profile.displayName,
          profile.photos?.[0]?.value,
        );
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// ─── GitLab OAuth 2.0 Strategy ───────────────────────────────────────────────

passport.use(
  new GitLabStrategy(
    {
      clientID: env.gitlabClientId,
      clientSecret: env.gitlabClientSecret,
      callbackURL: `${env.apiPrefix}/auth/oauth/gitlab/callback`,
    },
    async (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: any) => {
      try {
        const email: string =
          profile.emails?.[0]?.value ?? profile.id + "@gitlab.oauth";
        const user = await upsertOAuthUser(
          "gitlab",
          profile.id,
          email,
          profile.displayName,
          profile.photos?.[0]?.value,
        );
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    service: env.serviceName,
    status: "ok",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─── Email Auth ───────────────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/auth/signup`, async (req, res) => {
  try {
    const { fullName, email, password } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(users)
      .values({ fullName: fullName?.trim() ?? null, email: normalizedEmail, passwordHash, authProvider: "local" })
      .returning();

    const accessToken = await issueTokenPair(res, created.id);

    res.status(201).json({
      message: "Signup successful.",
      accessToken,
      user: { id: created.id, fullName: created.fullName, email: created.email },
    });
  } catch (err) {
    console.error("[signup]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post(`${env.apiPrefix}/auth/signin`, async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses social login. Please sign in with your provider." });
      return;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const accessToken = await issueTokenPair(res, user.id);

    res.json({
      message: "Signin successful.",
      accessToken,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    });
  } catch (err) {
    console.error("[signin]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/auth/refresh`, async (req, res) => {
  try {
    const rawToken: string | undefined = req.cookies?.refresh_token;

    if (!rawToken) {
      res.status(401).json({ error: "No refresh token provided." });
      return;
    }

    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const [existing] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash));

    if (!existing) {
      res.status(401).json({ error: "Invalid refresh token." });
      return;
    }

    if (existing.expiresAt < new Date()) {
      // Expired — delete it and reject
      await db.delete(refreshTokens).where(eq(refreshTokens.id, existing.id));
      res.clearCookie("refresh_token", { path: "/api/v1/auth" });
      res.status(401).json({ error: "Refresh token expired." });
      return;
    }

    // Token rotation: revoke the old token and issue a brand-new pair
    await db.delete(refreshTokens).where(eq(refreshTokens.id, existing.id));

    const [user] = await db.select().from(users).where(eq(users.id, existing.userId));
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    const accessToken = await issueTokenPair(res, user.id);

    res.json({
      accessToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, authProvider: user.authProvider, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error("[refresh]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── Sign Out ─────────────────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/auth/signout`, async (req, res) => {
  try {
    const rawToken: string | undefined = req.cookies?.refresh_token;

    // Revoke the specific refresh token if present
    if (rawToken) {
      await revokeSingleRefreshToken(rawToken);
    }

    // Also try to revoke ALL tokens for the user if we can identify them
    const accessToken =
      req.cookies?.auth_token ??
      req.headers.authorization?.replace("Bearer ", "");
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, env.jwtSecret) as { sub: string };
        await revokeAllRefreshTokens(payload.sub);
      } catch {
        // Access token might be expired, that's fine — we already revoked by refresh token
      }
    }

    res.clearCookie("auth_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.json({ message: "Signed out." });
  } catch (err) {
    console.error("[signout]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── /me — verify access token ───────────────────────────────────────────────

app.get(`${env.apiPrefix}/auth/me`, async (req, res) => {
  try {
    const token =
      req.cookies?.auth_token ??
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, authProvider: user.authProvider, avatarUrl: user.avatarUrl } });
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

// Simple auth helper: extract user id from access token
function getUserIdFromReq(req: express.Request): string | null {
  try {
    const token = req.cookies?.auth_token ?? req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Workspaces API ────────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/workspaces`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "Name is required" });

    const [created] = await db.insert(workspaces).values({ name, ownerId: userId }).returning();
    res.status(201).json({ workspace: created });
  } catch (err) {
    console.error("[create workspace]", err);
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
    console.error("[list workspaces]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Spaces API ───────────────────────────────────────────────────────────

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
    console.error("[create space]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(`${env.apiPrefix}/workspaces/:id/spaces`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const workspaceId = req.params.id;
    const list = await db.select().from(spaces).where(eq(spaces.workspaceId, workspaceId));
    res.json({ spaces: list });
  } catch (err) {
    console.error("[list spaces]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Work items API ───────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/spaces/:id/work_items`, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const spaceId = req.params.id;
    const { title, type, status, dueDate } = req.body as { title?: string; type?: string; status?: string; dueDate?: string };
    if (!title) return res.status(400).json({ error: "Title is required" });

    const [created] = await db.insert(workItems).values({ title, type: type ?? "task", status: status ?? "todo", spaceId, dueDate: dueDate ? new Date(dueDate) : null }).returning();
    res.status(201).json({ workItem: created });
  } catch (err) {
    console.error("[create work item]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(`${env.apiPrefix}/spaces/:id/work_items`, async (req, res) => {
  try {
    const spaceId = req.params.id;
    const list = await db.select().from(workItems).where(eq(workItems.spaceId, spaceId));
    res.json({ workItems: list });
  } catch (err) {
    console.error("[list work items]", err);
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
    console.error("[update work item]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Google OIDC Routes ───────────────────────────────────────────────────────

app.get(
  `${env.apiPrefix}/auth/oauth/google`,
  passport.authenticate("google", { session: true }),
);

app.get(
  `${env.apiPrefix}/auth/oauth/google/callback`,
  passport.authenticate("google", { session: true, failureRedirect: `${env.frontendUrl}/?error=google_failed` }),
  async (req, res) => {
    const user = req.user as any;
    const accessToken = await issueTokenPair(res, user.id);
    res.redirect(`${env.frontendUrl}/auth/callback?token=${accessToken}`);
  },
);

// ─── GitHub OAuth 2.0 Routes ─────────────────────────────────────────────────

app.get(
  `${env.apiPrefix}/auth/oauth/github`,
  passport.authenticate("github", { session: true, scope: ["user:email"] }),
);

app.get(
  `${env.apiPrefix}/auth/oauth/github/callback`,
  passport.authenticate("github", { session: true, failureRedirect: `${env.frontendUrl}/?error=github_failed` }),
  async (req, res) => {
    const user = req.user as any;
    const accessToken = await issueTokenPair(res, user.id);
    res.redirect(`${env.frontendUrl}/auth/callback?token=${accessToken}`);
  },
);

// ─── GitLab OAuth 2.0 Routes ─────────────────────────────────────────────────

app.get(
  `${env.apiPrefix}/auth/oauth/gitlab`,
  passport.authenticate("gitlab", { session: true }),
);

app.get(
  `${env.apiPrefix}/auth/oauth/gitlab/callback`,
  passport.authenticate("gitlab", { session: true, failureRedirect: `${env.frontendUrl}/?error=gitlab_failed` }),
  async (req, res) => {
    const user = req.user as any;
    const accessToken = await issueTokenPair(res, user.id);
    res.redirect(`${env.frontendUrl}/auth/callback?token=${accessToken}`);
  },
);

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start() {
  const { pool } = await import("./db/index.js");
  await pool.query("SELECT 1");
  console.log("✓ PostgreSQL connected");

  // Cleanup expired refresh tokens on boot
  await cleanupExpiredTokens();

  app.listen(env.port, () => {
    console.log(`✓ ${env.serviceName} listening on http://localhost:${env.port}`);
    console.log(`  Google OIDC  → http://localhost:${env.port}${env.apiPrefix}/auth/oauth/google`);
    console.log(`  GitHub OAuth → http://localhost:${env.port}${env.apiPrefix}/auth/oauth/github`);
    console.log(`  GitLab OAuth → http://localhost:${env.port}${env.apiPrefix}/auth/oauth/gitlab`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});