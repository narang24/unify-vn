/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://unify:unify_dev_pass@localhost:5432/unify_dev";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl.includes("sslmode")
      ? databaseUrl
      : `${databaseUrl}?sslmode=require`,
  },
});
