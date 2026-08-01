import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Auth service port (default 8001)
  port: Number(process.env.AUTH_PORT ?? 8001),

  // Workspace service port (default 8002)
  workspacePort: Number(process.env.WORKSPACE_PORT ?? 8002),

  // Gateway port — prefers the platform-injected PORT (Render, Railway, etc.)
  // so the gateway binds to the only publicly-reachable port.
  gatewayPort: Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 8000),

  backendUrl: process.env.BACKEND_URL ?? "http://localhost:8000",

  serviceName: process.env.SERVICE_NAME ?? "unify-backend",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://unify:unify_dev_pass@localhost:5432/unify_dev",

  // AI incident-agent service (FastAPI in /ai-agent)
  aiAgentUrl: process.env.AI_AGENT_URL ?? "http://localhost:8088",

  // Redis (caching, sessions, prefs). Falls back to in-memory when unset/unreachable.
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret",

  // Google OIDC
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // GitHub OAuth 2.0
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",

  // SMTP (email delivery — invitation emails, etc). No-ops with a warning in
  // dev if SMTP_HOST is unset; see backend/services/workspace/src/lib/email.ts.
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Unify <no-reply@unify.dev>",

  // GitLab OAuth 2.0
  gitlabClientId: process.env.GITLAB_CLIENT_ID ?? "",
  gitlabClientSecret: process.env.GITLAB_CLIENT_SECRET ?? "",
} as const;