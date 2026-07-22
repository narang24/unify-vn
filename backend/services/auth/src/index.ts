import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "../../../src/config/env.js";
import { db } from "../../../src/db/index.js";
import { users, refreshTokens } from "../../../src/db/schema.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

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

app.post(`${env.apiPrefix}/auth/signup`, async (req, res) => {
  try {
    const { fullName, email, password } = req.body as { fullName?: string; email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db.select().from(users).where(users.email.eq(normalizedEmail));
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(users).values({ fullName: fullName?.trim() ?? null, email: normalizedEmail, passwordHash, authProvider: "local" }).returning();
    const accessToken = await issueTokenPair(res, created.id);
    res.status(201).json({ message: "Signup successful.", accessToken, user: { id: created.id, fullName: created.fullName, email: created.email } });
  } catch (err) {
    console.error("[auth.signup]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post(`${env.apiPrefix}/auth/signin`, async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const [user] = await db.select().from(users).where(users.email.eq(email.toLowerCase().trim()));
    if (!user) return res.status(401).json({ error: "Invalid email or password." });
    if (!user.passwordHash) return res.status(401).json({ error: "This account uses social login. Please sign in with your provider." });
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return res.status(401).json({ error: "Invalid email or password." });
    const accessToken = await issueTokenPair(res, user.id);
    res.json({ message: "Signin successful.", accessToken, user: { id: user.id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    console.error("[auth.signin]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post(`${env.apiPrefix}/auth/refresh`, async (req, res) => {
  try {
    const rawToken: string | undefined = req.cookies?.refresh_token;
    if (!rawToken) return res.status(401).json({ error: "No refresh token provided." });
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const [existing] = await db.select().from(refreshTokens).where(refreshTokens.tokenHash.eq(hash));
    if (!existing) return res.status(401).json({ error: "Invalid refresh token." });
    if (existing.expiresAt < new Date()) {
      await db.delete(refreshTokens).where(refreshTokens.id.eq(existing.id));
      res.clearCookie("refresh_token", { path: "/api/v1/auth" });
      return res.status(401).json({ error: "Refresh token expired." });
    }
    await db.delete(refreshTokens).where(refreshTokens.id.eq(existing.id));
    const [user] = await db.select().from(users).where(users.id.eq(existing.userId));
    if (!user) return res.status(401).json({ error: "User not found." });
    const accessToken = await issueTokenPair(res, user.id);
    res.json({ accessToken, user: { id: user.id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    console.error("[auth.refresh]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post(`${env.apiPrefix}/auth/signout`, async (req, res) => {
  try {
    const rawToken: string | undefined = req.cookies?.refresh_token;
    if (rawToken) {
      const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
      await db.delete(refreshTokens).where(refreshTokens.tokenHash.eq(hash));
    }
    res.clearCookie("auth_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.json({ message: "Signed out." });
  } catch (err) {
    console.error("[auth.signout]", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get(`${env.apiPrefix}/auth/me`, async (req, res) => {
  try {
    const token = req.cookies?.auth_token ?? req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Not authenticated." });
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    const [user] = await db.select().from(users).where(users.id.eq(payload.sub));
    if (!user) return res.status(401).json({ error: "User not found." });
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, authProvider: user.authProvider, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

app.get("/health", (_req, res) => res.json({ service: "auth", status: "ok" }));

app.listen(env.port + 0, () => {
  console.log(`Auth service listening on http://localhost:${env.port}`);
});
