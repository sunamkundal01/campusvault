import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./local.db";
const isRemote = url.startsWith("libsql://") || url.startsWith("wss://") || url.startsWith("https://");

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: isRemote
    ? { url, authToken: process.env.DATABASE_AUTH_TOKEN }
    : { url },
} satisfies Config;
