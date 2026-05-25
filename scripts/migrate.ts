import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("✓ migrations applied");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
