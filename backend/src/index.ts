/**
 * Unify API Gateway (Node.js dev proxy)
 * ──────────────────────────────────────
 * This is the lightweight Node.js gateway used for local development
 * when Nginx is not available or not desired.
 *
 * In production, swap this out for the Nginx gateway (nginx/nginx.conf).
 *
 * Port layout:
 *   :8000  ← this gateway (single entry point for the frontend)
 *   :8001  ← auth service     (services/auth/src/index.ts)
 *   :8002  ← workspace service (services/workspace/src/index.ts)
 */

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import http from "node:http";
import httpProxy from "http-proxy";
import { env } from "./config/env.js";

const GATEWAY_PORT = env.gatewayPort;   // 8000
const AUTH_PORT    = env.port;          // 8001
const WS_PORT      = env.workspacePort; // 8002

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  // Forward cookies as-is so the browser's HttpOnly refresh_token cookie
  // gets sent through to the auth service.
  cookieDomainRewrite: "",
});

proxy.on("error", (err, _req, res) => {
  console.error("[gateway proxy error]", err.message);
  const response = res as http.ServerResponse;
  if (!response.headersSent) {
    response.writeHead(502, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Bad gateway — upstream service unavailable" }));
  }
});

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // ── CORS pre-flight ──────────────────────────────────────────────────────
  const origin = req.headers.origin ?? "";
  const isAllowedOrigin =
    origin === env.frontendUrl ||
    (env.nodeEnv === "development" && /^http:\/\/localhost(:\d+)?$/.test(origin));

  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Cookie");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Health check ─────────────────────────────────────────────────────────
  if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "api-gateway",
        status: "ok",
        port: GATEWAY_PORT,
        upstreams: {
          auth: `http://localhost:${AUTH_PORT}`,
          workspace: `http://localhost:${WS_PORT}`,
        },
      }),
    );
    return;
  }

  // ── Route: /api/v1/auth/** → auth service :8001 ──────────────────────────
  const authPrefix = `${env.apiPrefix}/auth`;
  if (url.startsWith(authPrefix)) {
    proxy.web(req, res, { target: `http://localhost:${AUTH_PORT}` });
    return;
  }

  // ── Route: /api/v1/** → workspace service :8002 ──────────────────────────
  if (url.startsWith(env.apiPrefix)) {
    proxy.web(req, res, { target: `http://localhost:${WS_PORT}` });
    return;
  }

  // ── 404 for everything else ───────────────────────────────────────────────
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(GATEWAY_PORT, () => {
  console.log(`\n✓ Unify API Gateway listening on http://localhost:${GATEWAY_PORT}`);
  console.log(`  /api/v1/auth/**  →  http://localhost:${AUTH_PORT}  (auth service)`);
  console.log(`  /api/v1/**       →  http://localhost:${WS_PORT}   (workspace service)`);
  console.log(`\n  Health check: http://localhost:${GATEWAY_PORT}/health\n`);
});