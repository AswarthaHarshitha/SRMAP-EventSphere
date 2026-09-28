import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { closeDb, getDb } from "../server/db";

if (existsSync(".env")) process.loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

await migrate(getDb() as unknown as NodePgDatabase, { migrationsFolder: "migrations" });
console.log("Database migrations applied.");
await closeDb();
