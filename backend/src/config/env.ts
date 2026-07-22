import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4001),
  serviceName: process.env.SERVICE_NAME ?? "unify-backend",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://unify:unify_dev_pass@localhost:5432/unify_dev",
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