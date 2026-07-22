import "dotenv/config";
export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 4001),
    serviceName: process.env.SERVICE_NAME ?? "unify-backend",
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
    apiPrefix: process.env.API_PREFIX ?? "/api/v1",
    mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/unify_vn",
    jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret",
};
