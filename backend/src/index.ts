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

// In production (Render, Railway, etc.) the platform injects PORT as the
// single publicly-reachable port.  Fall back to GATEWAY_PORT for local dev.
const GATEWAY_PORT = Number(process.env.PORT ?? env.gatewayPort);
const AUTH_PORT = env.port;       // AUTH_PORT env var (4001 on Render)
const WS_PORT = env.workspacePort; // WORKSPACE_PORT env var (8002)

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  // Forward cookies as-is so the browser's HttpOnly refresh_token cookie
  // gets sent through to the auth service.
  cookieDomainRewrite: "",
});

proxy.on("error", (err, _req, res) => {
  console.error("[gateway proxy error]", err.message);

  // `res` is an http.ServerResponse when a regular proxy.web() request fails,
  // but a raw net.Socket when a proxy.ws() WebSocket upgrade fails (see the
  // `server.on("upgrade", ...)` handler below) — the SAME "error" event
  // fires for both, with a different-shaped third argument. Treating it as
  // always-a-response used to throw ("writeHead is not a function") on any
  // WebSocket connect failure, which crashed the whole gateway process and
  // took every other /api/v1 route down with it. Branch on the actual shape
  // instead of assuming one.
  const target = res as Partial<http.ServerResponse> & { destroyed?: boolean; destroy?: () => void };
  if (typeof target.writeHead === "function") {
    if (!target.headersSent) {
      target.writeHead(502, { "Content-Type": "application/json" });
      target.end?.(JSON.stringify({ error: "Bad gateway — upstream service unavailable" }));
    }
  } else if (typeof target.destroy === "function" && !target.destroyed) {
    target.destroy();
  }
});

// Defense-in-depth for this dev proxy: it exists purely to route traffic, so
// one bad/unexpected error should never be allowed to take the whole thing
// down (production uses the Nginx gateway instead — see nginx/nginx.conf).
process.on("uncaughtException", (err) => {
  console.error("[gateway] uncaught exception (ignored, staying up):", err);
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

  // ── Route: /api/v1/auth/** → auth service :4001 ──────────────────────────
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

// ── WebSocket upgrade: /api/v1/socket.io → workspace service :8002 ─────────
// The real-time friends hub (services/workspace/src/ws/realtime.ts) is a
// Socket.IO server living on the workspace service; the gateway just tunnels
// the upgrade through since it's the frontend's single entry point (same as
// every other /api/v1 route). Socket.IO's HTTP polling handshake requests
// share this same path prefix, so they already flow through the ordinary
// proxy.web() route above — only the WebSocket transport's upgrade needs
// this dedicated handler.
const socketIoPath = `${env.apiPrefix}/socket.io`;
server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "/";
  if (url.startsWith(socketIoPath)) {
    proxy.ws(req, socket, head, { target: `http://localhost:${WS_PORT}` });
  } else {
    socket.destroy();
  }
});

server.listen(GATEWAY_PORT, () => {
  console.log(`\n✓ Unify API Gateway listening on http://localhost:${GATEWAY_PORT}`);
  console.log(`  /api/v1/auth/**     →  http://localhost:${AUTH_PORT}  (auth service)`);
  console.log(`  /api/v1/**          →  http://localhost:${WS_PORT}   (workspace service)`);
  console.log(`  /api/v1/socket.io   →  http://localhost:${WS_PORT}   (workspace service, Socket.IO)`);
  console.log(`\n  Health check: http://localhost:${GATEWAY_PORT}/health\n`);
});