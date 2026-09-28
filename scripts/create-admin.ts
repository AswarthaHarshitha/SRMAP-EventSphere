/**
 * Creates the first administrator, or promotes an existing account.
 *
 *   npm run create-admin -- --email you@srmap.edu.in --name "Your Name"
 *
 * The password is read from ADMIN_PASSWORD, or prompted for, so it never lands in shell history.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { eq, sql } from "drizzle-orm";
import { users } from "../shared/schema";
import { emailSchema, passwordSchema } from "../shared/validation";
import { hashPassword } from "../server/auth";
import { closeDb, getDb } from "../server/db";

if (existsSync(".env")) process.loadEnvFile(".env");

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
const email = emailSchema.parse(values.email);
const db = getDb();
const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (existing) {
  await db
    .update(users)
    .set({ role: "admin", isActive: true, tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, existing.id));
  console.log(`${email} is now an administrator.`);
} else {
  if (!values.name) throw new Error("--name is required when creating a new account.");
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password for the new admin: ");
    rl.close();
  }
  await db.insert(users).values({
    email,
    name: values.name.trim(),
    role: "admin",
    passwordHash: await hashPassword(passwordSchema.parse(password)),
  });
  console.log(`Administrator ${email} created.`);
}
await closeDb();
