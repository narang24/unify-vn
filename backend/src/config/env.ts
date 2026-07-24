import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Auth service port (default 8001)
  port: Number(process.env.PORT ?? 8001),

  // Workspace service port (default 8002)
  workspacePort: Number(process.env.WORKSPACE_PORT ?? 8002),

  // Gateway port (default 8000) — used by the Node.js dev proxy and nginx
  gatewayPort: Number(process.env.GATEWAY_PORT ?? 8000),

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

  // GitLab OAuth 2.0
  gitlabClientId: process.env.GITLAB_CLIENT_ID ?? "",
  gitlabClientSecret: process.env.GITLAB_CLIENT_SECRET ?? "",
} as const;