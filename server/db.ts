import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../shared/schema";
import { config } from "./config";
import { HttpError } from "./errors";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let pool: pg.Pool | null = null;
let instance: Database | null = null;

function sslFor(url: string): pg.PoolConfig["ssl"] {
  const host = new URL(url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocal || /sslmode=disable/.test(url)) return undefined;
  return { rejectUnauthorized: true };
}

export function getDb(): Database {
  if (instance) return instance;

  const url = config().databaseUrl;
  if (!url) {
    throw new HttpError(503, "SERVICE_UNAVAILABLE", "The service is not configured yet. Please try again later.");
  }

  pool = new pg.Pool({
    // Remove sslmode from the URL so the explicit ssl option below is authoritative.
    connectionString: url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, ""),
    ssl: sslFor(url),
    // Serverless instances each hold a small pool; the provider-side pooler handles fan-in.
    max: config().isProduction ? 3 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));

  instance = drizzle(pool, { schema }) as unknown as Database;
  return instance;
}

/** Swap in another database (used by tests to run against an in-process Postgres). */
export function setDb(db: Database | null) {
  instance = db;
}

export async function closeDb() {
  await pool?.end();
  pool = null;
  instance = null;
}
