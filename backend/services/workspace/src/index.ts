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

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[workspace unhandled error]", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start() {
  await pool.query("SELECT 1");
  console.log("✓ Workspace service connected to PostgreSQL");

  app.listen(WORKSPACE_PORT, () => {
    console.log(`✓ Workspace service listening on http://localhost:${WORKSPACE_PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start workspace service:", err);
  process.exit(1);
});
