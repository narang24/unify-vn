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

import { env } from "../../../src/config/env.js";
import { db, pool } from "../../../src/db/index.js";
import { users, refreshTokens } from "../../../src/db/schema.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_PORT = env.port; // 8001

// ─── Types ────────────────────────────────────────────────────────────────────

interface OAuthProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function createRefreshTokenForUser(userId: string): Promise<string> {
  const { raw, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await db.insert(refreshTokens).values({ userId, tokenHash: hash, expiresAt });
  return raw;
}

function sendRefreshCookie(res: express.Response, rawToken: string) {
  res.cookie("refresh_token", rawToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "strict" : "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/api/v1/auth",
  });
}

async function issueTokenPair(res: express.Response, userId: string) {
  const accessToken = signAccessToken(userId);
  const raw = await createRefreshTokenForUser(userId);
  sendRefreshCookie(res, raw);
  return accessToken;
}

async function revokeSingleRefreshToken(rawToken: string) {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
}

async function revokeAllRefreshTokens(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

async function cleanupExpiredTokens() {
  const deleted = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()))
    .returning();
  if (deleted.length > 0) {
    console.log(`  Cleaned ${deleted.length} expired refresh token(s)`);
  }
}

// ─── OAuth Helper ─────────────────────────────────────────────────────────────

async function upsertOAuthUser(
  provider: "google" | "github" | "gitlab",
  providerAccountId: string,
  email: string,
  fullName?: string,
  avatarUrl?: string,
  github?: { accessToken?: string; login?: string },
) {
  const githubFields =
    provider === "github"
      ? { githubAccessToken: github?.accessToken ?? null, githubLogin: github?.login ?? null }
      : {};

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
  if (byProvider) {
    if (provider === "github") {
      const [updated] = await db
        .update(users)
        .set({ ...githubFields, updatedAt: new Date() })
        .where(eq(users.id, byProvider.id))
        .returning();
      return updated;
    }
    return byProvider;
  }

  // 2. Try by email (link existing local account)
  if (email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (byEmail) {
      const [updated] = await db
        .update(users)
        .set({ authProvider: provider, providerAccountId, avatarUrl, ...githubFields, updatedAt: new Date() })
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
      ...githubFields,
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

// Minimal passport serialization (only used during OAuth handshake)
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
    async (_issuer: string, profile: any, done: any) => {
      try {
        const email: string = profile.emails?.[0]?.value ?? profile.id + "@google.oauth";
        const user = await upsertOAuthUser("google", profile.id, email, profile.displayName, profile.photos?.[0]?.value);
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
      // `repo` + `read:user` let users browse code/issues/PRs/branches/commits
      // right after connecting — no manual PAT or webhook setup required.
      scope: ["user:email", "read:user", "repo"],
    },
    async (accessToken: string, _refreshToken: string, profile: OAuthProfile & { username?: string }, done: any) => {
      try {
        const email: string = profile.emails?.[0]?.value ?? profile.id + "@github.oauth";
        const user = await upsertOAuthUser(
          "github",
          profile.id,
          email,
          profile.displayName,
          profile.photos?.[0]?.value,
          { accessToken, login: profile.username },
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
        const email: string = profile.emails?.[0]?.value ?? profile.id + "@gitlab.oauth";
        const user = await upsertOAuthUser("gitlab", profile.id, email, profile.displayName, profile.photos?.[0]?.value);
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ service: "auth", status: "ok", port: AUTH_PORT });
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
    console.error("[auth.signup]", err);
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
    console.error("[auth.signin]", err);
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
    const [existing] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));

    if (!existing) {
      res.status(401).json({ error: "Invalid refresh token." });
      return;
    }

    if (existing.expiresAt < new Date()) {
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
    console.error("[auth.refresh]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── Sign Out ─────────────────────────────────────────────────────────────────

app.post(`${env.apiPrefix}/auth/signout`, async (req, res) => {
  try {
    const rawToken: string | undefined = req.cookies?.refresh_token;

    if (rawToken) {
      await revokeSingleRefreshToken(rawToken);
    }

    // Also revoke ALL tokens for the user if we can identify them from the access token
    const accessToken = req.cookies?.auth_token ?? req.headers.authorization?.replace("Bearer ", "");
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, env.jwtSecret) as { sub: string };
        await revokeAllRefreshTokens(payload.sub);
      } catch {
        // Access token might be expired — the refresh token revocation above is sufficient
      }
    }

    res.clearCookie("auth_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.json({ message: "Signed out." });
  } catch (err) {
    console.error("[auth.signout]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── /me ─────────────────────────────────────────────────────────────────────

app.get(`${env.apiPrefix}/auth/me`, async (req, res) => {
  try {
    const token = req.cookies?.auth_token ?? req.headers.authorization?.replace("Bearer ", "");

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

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl,
        githubConnected: !!user.githubAccessToken,
        githubLogin: user.githubLogin,
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
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
  console.error("[auth unhandled error]", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start() {
  await pool.query("SELECT 1");
  console.log("✓ Auth service connected to PostgreSQL");

  // Cleanup expired refresh tokens on boot
  await cleanupExpiredTokens();

  app.listen(AUTH_PORT, () => {
    console.log(`✓ Auth service listening on http://localhost:${AUTH_PORT}`);
    console.log(`  Google OIDC  → http://localhost:${AUTH_PORT}${env.apiPrefix}/auth/oauth/google`);
    console.log(`  GitHub OAuth → http://localhost:${AUTH_PORT}${env.apiPrefix}/auth/oauth/github`);
    console.log(`  GitLab OAuth → http://localhost:${AUTH_PORT}${env.apiPrefix}/auth/oauth/gitlab`);
  });
}

start().catch((err) => {
  console.error("Failed to start auth service:", err);
  process.exit(1);
});
