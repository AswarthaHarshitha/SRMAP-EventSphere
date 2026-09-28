import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { users } from "../shared/schema";
import type { Database } from "../server/db";
import { resetConfig } from "../server/config";
import { app, createUser, loginAs, PASSWORD, setupTestDb } from "./helpers";

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
});
afterAll(() => close());

describe("registration", () => {
  it("creates a student account and starts a session", async () => {
    const agent = request.agent(app());
    const res = await agent
      .post("/api/auth/register")
      .send({ name: "Asha Rao", email: "Asha.Rao@SRMAP.edu.in", password: "secure123" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: "asha.rao@srmap.edu.in", role: "student" });
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"][0]).toMatch(/evs_session=.*HttpOnly/i);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("asha.rao@srmap.edu.in");
  });

  it("ignores a role supplied by the client", async () => {
    const res = await request(app())
      .post("/api/auth/register")
      .send({ name: "Mallory", email: "mallory@srmap.edu.in", password: "secure123", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("student");
  });

  it("stores a bcrypt hash, never the password", async () => {
    const [row] = await db.select().from(users).where(eq(users.email, "mallory@srmap.edu.in"));
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.passwordHash).not.toContain("secure123");
  });

  it("rejects duplicate emails and weak passwords", async () => {
    const dup = await request(app())
      .post("/api/auth/register")
      .send({ name: "Asha Again", email: "asha.rao@srmap.edu.in", password: "secure123" });
    expect(dup.status).toBe(409);

    const weak = await request(app())
      .post("/api/auth/register")
      .send({ name: "Weak", email: "weak@srmap.edu.in", password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields.password).toBeDefined();
  });

  it("enforces ALLOWED_EMAIL_DOMAINS when configured", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "srmap.edu.in";
    resetConfig();
    try {
      const res = await request(app())
        .post("/api/auth/register")
        .send({ name: "Outsider", email: "outsider@gmail.com", password: "secure123" });
      expect(res.status).toBe(400);
    } finally {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
      resetConfig();
    }
  });
});

describe("login and sessions", () => {
  it("rejects wrong passwords and unknown emails with the same message", async () => {
    const user = await createUser(db, "student");
    const wrong = await request(app()).post("/api/auth/login").send({ email: user.email, password: "nope12345" });
    const unknown = await request(app()).post("/api/auth/login").send({ email: "ghost@srmap.edu.in", password: "nope12345" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("requires authentication for protected routes", async () => {
    expect((await request(app()).get("/api/me/registrations")).status).toBe(401);
    expect((await request(app()).get("/api/me/registrations")).status).toBe(401);
  });

  it("rejects tampered session cookies", async () => {
    const res = await request(app()).get("/api/me/registrations").set("Cookie", "evs_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("SESSION_EXPIRED");
  });

  it("logs out by clearing the cookie", async () => {
    const user = await createUser(db, "student");
    const agent = await loginAs(user.email);
    await agent.post("/api/auth/logout").expect(200);
    expect((await agent.get("/api/me/registrations")).status).toBe(401);
  });

  it("blocks deactivated accounts and revokes their sessions", async () => {
    const user = await createUser(db, "student");
    const agent = await loginAs(user.email);
    await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    expect((await agent.get("/api/me/registrations")).status).toBe(401);
    const login = await request(app()).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(login.status).toBe(403);
  });

  it("changing the password signs out other sessions", async () => {
    const user = await createUser(db, "student");
    const laptop = await loginAs(user.email);
    const phone = await loginAs(user.email);
    const res = await laptop.post("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "NewPassw0rd" });
    expect(res.status).toBe(200);
    expect((await laptop.get("/api/auth/me")).status).toBe(200);
    expect((await phone.get("/api/me/registrations")).status).toBe(401);
  });

  it("updates the profile without allowing role changes", async () => {
    const user = await createUser(db, "student");
    const agent = await loginAs(user.email);
    const res = await agent.patch("/api/auth/me").send({ name: "Updated Name", department: "CSE", phone: "+91 98765 43210", role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "Updated Name", department: "CSE", role: "student" });
  });
});

describe("request hardening", () => {
  it("rejects state-changing requests from foreign origins", async () => {
    const res = await request(app())
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "x@srmap.edu.in", password: "whatever1" });
    expect(res.status).toBe(403);
  });

  it("returns JSON 404s for unknown API routes and hides internals on bad JSON", async () => {
    const missing = await request(app()).get("/api/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const bad = await request(app()).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.ts/);
  });

  it("reports health with database status", async () => {
    const res = await request(app()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "up" });
  });
});
