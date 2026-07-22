export const appEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Unify",
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001",
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000",
} as const;