/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://unify:unify_dev_pass@localhost:5432/unify_dev";

const isLocalHost = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);

// Local Postgres (e.g. a docker-compose instance on localhost) almost never has
// SSL configured, so forcing sslmode=require against it hangs the connection
// indefinitely. Only force SSL for non-local (staging/production) hosts.
const withSsl =
  databaseUrl.includes("sslmode") || isLocalHost
    ? databaseUrl
    : `${databaseUrl}?sslmode=require`;

// A blocked/unreachable host (wrong DATABASE_URL, region mismatch, firewall
// silently dropping packets, etc.) makes `pg` hang forever waiting to connect
// instead of failing fast — which then hangs the whole deploy until the
// platform's own timeout kills it. Cap it so a bad connection surfaces as a
// clear "timeout" error within seconds instead.
const connectionUrl = withSsl.includes("connect_timeout")
  ? withSsl
  : `${withSsl}${withSsl.includes("?") ? "&" : "?"}connect_timeout=15`;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
});
