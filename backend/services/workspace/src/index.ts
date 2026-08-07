import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "../../../src/config/env.js";
import { pool } from "../../../src/db/index.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { spacesRouter } from "./routes/spaces.js";
import { workItemsRouter } from "./routes/workItems.js";
import { sprintsRouter } from "./routes/sprints.js";
import { repositoriesRouter } from "./routes/repositories.js";
import { deploymentsRouter } from "./routes/deployments.js";
import { incidentsRouter } from "./routes/incidents.js";
import { githubRouter } from "./routes/github.js";
import { prefsRouter } from "./routes/prefs.js";
import { teamsRouter } from "./routes/teams.js";
import { notificationsRouter } from "./routes/notifications.js";
import { usersRouter } from "./routes/users.js";
import { membersRouter } from "./routes/members.js";
import { intelliRouter } from "./routes/intelli.js";
import { friendsRouter } from "./routes/friends.js";
import { attachRealtime } from "./ws/realtime.js";

// ─── App Setup ───────────────────────────────────────────────────────────────

const WORKSPACE_PORT = env.workspacePort; // 8002

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (env.nodeEnv === "development") {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      }
      if (origin === env.frontendUrl) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ service: "workspace", status: "ok", port: WORKSPACE_PORT });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// Each router module owns its own auth + validation — keeps this service
// modular and easy to split further (e.g. sprints → its own microservice).

app.use(env.apiPrefix, workspacesRouter);
app.use(env.apiPrefix, spacesRouter);
app.use(env.apiPrefix, workItemsRouter);
app.use(env.apiPrefix, sprintsRouter);
app.use(env.apiPrefix, repositoriesRouter);
app.use(env.apiPrefix, deploymentsRouter);
app.use(env.apiPrefix, incidentsRouter);
app.use(env.apiPrefix, githubRouter);
app.use(env.apiPrefix, prefsRouter);
app.use(env.apiPrefix, teamsRouter);
app.use(env.apiPrefix, notificationsRouter);
app.use(env.apiPrefix, usersRouter);
app.use(env.apiPrefix, membersRouter);
app.use(env.apiPrefix, intelliRouter);
app.use(env.apiPrefix, friendsRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[workspace unhandled error]", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start() {
  await pool.query("SELECT 1");
  console.log("✓ Workspace service connected to PostgreSQL");

  const server = app.listen(WORKSPACE_PORT, () => {
    console.log(`✓ Workspace service listening on http://localhost:${WORKSPACE_PORT}`);
  });

  // Real-time Socket.IO hub (friend requests/accepts/declines etc.) shares
  // this same HTTP server/port — see ./ws/realtime.ts.
  await attachRealtime(server);
}

start().catch((err) => {
  console.error("Failed to start workspace service:", err);
  process.exit(1);
});
