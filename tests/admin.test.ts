import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { User } from "../shared/schema";
import type { Database } from "../server/db";
import { app, createUser, insertEvent, loginAs, setupTestDb } from "./helpers";

let db: Database;
let close: () => Promise<void>;
let admin: User;
let organizer: User;
let student: User;

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
  admin = await createUser(db, "admin");
  organizer = await createUser(db, "organizer");
  student = await createUser(db, "student");
});
afterAll(() => close());

describe("admin authorization", () => {
  it.each(["/api/admin/stats", "/api/admin/users", "/api/admin/events", "/api/admin/registrations"])(
    "%s is admin-only",
    async (path) => {
      expect((await request(app()).get(path)).status).toBe(401);
      expect((await (await loginAs(student.email)).get(path)).status).toBe(403);
      expect((await (await loginAs(organizer.email)).get(path)).status).toBe(403);
      expect((await (await loginAs(admin.email)).get(path)).status).toBe(200);
    },
  );

  it("organizer endpoints reject students", async () => {
    const agent = await loginAs(student.email);
    expect((await agent.get("/api/organizer/events")).status).toBe(403);
    expect((await agent.get("/api/organizer/stats")).status).toBe(403);
  });
});

describe("admin features", () => {
  it("reports statistics computed from real data", async () => {
    const event = await insertEvent(db, organizer.id);
    await insertEvent(db, organizer.id, { status: "draft" });
    const s = await loginAs(student.email);
    await s.post(`/api/events/${event.id}/register`).expect(201);

    const res = await (await loginAs(admin.email)).get("/api/admin/stats");
    expect(res.body.data.users).toMatchObject({ total: 3, students: 1, organizers: 1, admins: 1 });
    expect(res.body.data.events).toMatchObject({ total: 2, published: 1, drafts: 1 });
    expect(res.body.data.registrations).toMatchObject({ confirmed: 1 });
    expect(res.body.data.registrationsByDay).toHaveLength(30);
    expect(res.body.data.registrationsByDay.at(-1).count).toBe(1);
    expect(res.body.data.recentRegistrations[0].event.id).toBe(event.id);

    const organizerStats = await (await loginAs(organizer.email)).get("/api/organizer/stats");
    expect(organizerStats.body.data).toMatchObject({ totalEvents: 2, publishedEvents: 1, totalRegistrations: 1 });
  });

  it("promotes a student to organizer and revokes their old session", async () => {
    const target = await createUser(db, "student");
    const targetSession = await loginAs(target.email);
    const asAdmin = await loginAs(admin.email);

    const res = await asAdmin.patch(`/api/admin/users/${target.id}`).send({ role: "organizer" });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("organizer");
    expect((await targetSession.get("/api/me/registrations")).status).toBe(401);

    const fresh = await loginAs(target.email);
    expect((await fresh.get("/api/organizer/events")).status).toBe(200);
  });

  it("deactivates accounts but not the admin's own", async () => {
    const target = await createUser(db, "student");
    const asAdmin = await loginAs(admin.email);
    expect((await asAdmin.patch(`/api/admin/users/${target.id}`).send({ isActive: false })).body.data.isActive).toBe(false);
    expect((await asAdmin.patch(`/api/admin/users/${admin.id}`).send({ role: "student" })).status).toBe(400);
    expect((await asAdmin.patch(`/api/admin/users/${target.id}`).send({ role: "superuser" })).status).toBe(400);
  });

  it("searches users and cancels registrations", async () => {
    const asAdmin = await loginAs(admin.email);
    const users = await asAdmin.get(`/api/admin/users?search=${encodeURIComponent(student.email)}`);
    expect(users.body.data.map((u: { id: number }) => u.id)).toEqual([student.id]);
    expect(users.body.data[0].passwordHash).toBeUndefined();

    const regs = await asAdmin.get("/api/admin/registrations?status=confirmed");
    const regId = regs.body.data[0].id;
    expect((await asAdmin.post(`/api/admin/registrations/${regId}/cancel`)).status).toBe(200);
  });
});
