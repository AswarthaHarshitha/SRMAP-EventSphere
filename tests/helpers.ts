import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import request from "supertest";
import * as schema from "../shared/schema";
import { users, events, type Event } from "../shared/schema";
import { createApp } from "../server/app";
import { hashPassword } from "../server/auth";
import { setDb, type Database } from "../server/db";
import { resetConfig } from "../server/config";
import type { UserRole } from "../shared/constants";

export const PASSWORD = "Passw0rd!23";

export async function setupTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "migrations" });
  setDb(db as unknown as Database);
  resetConfig();
  return { db: db as unknown as Database, close: () => client.close() };
}

export function app() {
  return createApp();
}

let seq = 0;
let cachedHash: string | null = null;

export async function createUser(db: Database, role: UserRole, overrides: Partial<typeof users.$inferInsert> = {}) {
  cachedHash ??= await hashPassword(PASSWORD);
  seq += 1;
  const [user] = await db
    .insert(users)
    .values({ name: `${role} ${seq}`, email: `${role}${seq}@srmap.edu.in`, passwordHash: cachedHash, role, ...overrides })
    .returning();
  return user;
}

/** Returns a supertest agent holding a session cookie for the user. */
export async function loginAs(email: string, password = PASSWORD) {
  const agent = request.agent(app());
  const res = await agent.post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

const hours = (n: number) => new Date(Date.now() + n * 3600_000);

export function eventPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Intro to Robotics Workshop",
    description: "Hands-on session building a line-following robot with the robotics club.",
    category: "Workshop",
    venue: "Academic Block 1, Room 204",
    startAt: hours(72).toISOString(),
    endAt: hours(75).toISOString(),
    registrationDeadline: hours(48).toISOString(),
    capacity: 50,
    priceInPaise: 0,
    ...overrides,
  };
}

export async function insertEvent(db: Database, organizerId: number, overrides: Partial<typeof events.$inferInsert> = {}): Promise<Event> {
  const [event] = await db
    .insert(events)
    .values({
      organizerId,
      title: "Published Event",
      description: "An event used by the automated test-suite to exercise flows.",
      category: "Technical",
      venue: "Main Auditorium",
      startAt: hours(72),
      endAt: hours(75),
      registrationDeadline: hours(48),
      capacity: 10,
      priceInPaise: 0,
      status: "published",
      ...overrides,
    })
    .returning();
  return event;
}

export { hours };
