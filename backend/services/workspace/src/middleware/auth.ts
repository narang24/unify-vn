import type express from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../../src/config/env.js";

export interface AuthedRequest extends express.Request {
  userId?: string;
}

/** Extracts and verifies the access token from cookie or Authorization header,
 *  then attaches userId to the request object. */
export function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const token =
      req.cookies?.auth_token ??
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
