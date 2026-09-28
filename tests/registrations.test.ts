import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { events, type User } from "../shared/schema";
import type { Database } from "../server/db";
import { app, createUser, hours, insertEvent, loginAs, setupTestDb } from "./helpers";

let db: Database;
let close: () => Promise<void>;
let organizer: User;
let otherOrganizer: User;

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
  organizer = await createUser(db, "organizer");
  otherOrganizer = await createUser(db, "organizer");
});
afterAll(() => close());

async function studentAgent() {
  const s = await createUser(db, "student");
  return { user: s, agent: await loginAs(s.email) };
}

const seats = async (id: number) =>
  (await db.select({ n: events.registeredCount }).from(events).where(eq(events.id, id)))[0].n;

describe("registering", () => {
  it("confirms a free registration and issues a unique ticket", async () => {
    const event = await insertEvent(db, organizer.id);
    const { agent } = await studentAgent();
    const res = await agent.post(`/api/events/${event.id}/register`);
    expect(res.status).toBe(201);
    expect(res.body.data.payment).toBeNull();
    expect(res.body.data.registration).toMatchObject({ status: "confirmed", eventId: event.id });
    expect(res.body.data.registration.ticketCode).toMatch(/^[0-9A-Z]{20}$/);
    expect(await seats(event.id)).toBe(1);

    const detail = await agent.get(`/api/events/${event.id}`);
    expect(detail.body.data.myRegistration.status).toBe("confirmed");
  });

  it("prevents duplicate registrations", async () => {
    const event = await insertEvent(db, organizer.id);
    const { agent } = await studentAgent();
    await agent.post(`/api/events/${event.id}/register`).expect(201);
    const again = await agent.post(`/api/events/${event.id}/register`);
    expect(again.status).toBe(409);
    expect(await seats(event.id)).toBe(1);
  });

  it("never oversells capacity under concurrent requests", async () => {
    const event = await insertEvent(db, organizer.id, { capacity: 3 });
    const agents = await Promise.all(Array.from({ length: 8 }, () => studentAgent()));
    const results = await Promise.all(agents.map(({ agent }) => agent.post(`/api/events/${event.id}/register`)));
    const ok = results.filter((r) => r.status === 201).length;
    expect(ok).toBe(3);
    expect(results.filter((r) => r.status === 409).every((r) => /full/i.test(r.body.error.message))).toBe(true);
    expect(await seats(event.id)).toBe(3);
  });

  it("refuses registration after the deadline, after start, and for drafts or cancelled events", async () => {
    const { agent } = await studentAgent();
    const closed = await insertEvent(db, organizer.id, { registrationDeadline: hours(-1) });
    expect((await agent.post(`/api/events/${closed.id}/register`)).body.error.message).toMatch(/closed/i);

    const started = await insertEvent(db, organizer.id, { startAt: hours(-1), endAt: hours(2), registrationDeadline: hours(-2) });
    expect((await agent.post(`/api/events/${started.id}/register`)).status).toBe(409);

    const draft = await insertEvent(db, organizer.id, { status: "draft" });
    expect((await agent.post(`/api/events/${draft.id}/register`)).status).toBe(404);

    const cancelled = await insertEvent(db, organizer.id, { status: "cancelled" });
    expect((await agent.post(`/api/events/${cancelled.id}/register`)).body.error.message).toMatch(/cancelled/i);
  });

  it("only lets students register", async () => {
    const event = await insertEvent(db, organizer.id);
    const org = await loginAs(organizer.email);
    expect((await org.post(`/api/events/${event.id}/register`)).status).toBe(403);
    expect((await request(app()).post(`/api/events/${event.id}/register`)).status).toBe(401);
  });
});

describe("tickets and ownership", () => {
  it("lets only the student, the event's organizer and admins view a ticket", async () => {
    const event = await insertEvent(db, organizer.id);
    const { agent, user } = await studentAgent();
    const reg = (await agent.post(`/api/events/${event.id}/register`)).body.data.registration;

    const own = await agent.get(`/api/registrations/${reg.id}`);
    expect(own.status).toBe(200);
    expect(own.body.data.attendee.id).toBe(user.id);

    const { agent: intruder } = await studentAgent();
    expect((await intruder.get(`/api/registrations/${reg.id}`)).status).toBe(404);
    expect((await intruder.post(`/api/registrations/${reg.id}/cancel`)).status).toBe(404);

    const org = await loginAs(organizer.email);
    expect((await org.get(`/api/registrations/${reg.id}`)).status).toBe(200);
    expect((await org.post(`/api/registrations/${reg.id}/cancel`)).status).toBe(404);

    const other = await loginAs(otherOrganizer.email);
    expect((await other.get(`/api/registrations/${reg.id}`)).status).toBe(404);
  });

  it("lists only the student's own registrations", async () => {
    const event = await insertEvent(db, organizer.id);
    const a = await studentAgent();
    const b = await studentAgent();
    await a.agent.post(`/api/events/${event.id}/register`).expect(201);
    const mine = await b.agent.get("/api/me/registrations");
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(0);
  });

  it("cancels a free registration, frees the seat, and allows re-registering", async () => {
    const event = await insertEvent(db, organizer.id, { capacity: 1 });
    const { agent } = await studentAgent();
    const reg = (await agent.post(`/api/events/${event.id}/register`)).body.data.registration;
    expect(await seats(event.id)).toBe(1);

    const cancel = await agent.post(`/api/registrations/${reg.id}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe("cancelled");
    expect(await seats(event.id)).toBe(0);
    expect((await agent.post(`/api/registrations/${reg.id}/cancel`)).status).toBe(409);

    expect((await agent.post(`/api/events/${event.id}/register`)).status).toBe(201);
  });
});

describe("check-in", () => {
  it("checks a ticket in once and reports duplicate scans", async () => {
    const event = await insertEvent(db, organizer.id);
    const { agent, user } = await studentAgent();
    const reg = (await agent.post(`/api/events/${event.id}/register`)).body.data.registration;
    const org = await loginAs(organizer.email);

    const first = await org.post(`/api/events/${event.id}/check-in`).send({ code: `EVS1:${reg.ticketCode}` });
    expect(first.status).toBe(200);
    expect(first.body.data.outcome).toBe("checked_in");
    expect(first.body.data.attendee.user.id).toBe(user.id);

    // Hand-typed codes are accepted in any case with separators.
    const typed = reg.ticketCode.toLowerCase().replace(/(.{5})/g, "$1-");
    const second = await org.post(`/api/events/${event.id}/check-in`).send({ code: typed });
    expect(second.status).toBe(200);
    expect(second.body.data.outcome).toBe("already_checked_in");
    expect(second.body.data.attendee.checkedInAt).toBe(first.body.data.attendee.checkedInAt);

    // Checked-in tickets can no longer be cancelled.
    expect((await agent.post(`/api/registrations/${reg.id}/cancel`)).status).toBe(409);
  });

  it("rejects tickets for other events, unknown codes and cancelled tickets", async () => {
    const eventA = await insertEvent(db, organizer.id);
    const eventB = await insertEvent(db, organizer.id);
    const { agent } = await studentAgent();
    const reg = (await agent.post(`/api/events/${eventA.id}/register`)).body.data.registration;
    const org = await loginAs(organizer.email);

    expect((await org.post(`/api/events/${eventB.id}/check-in`).send({ code: reg.ticketCode })).status).toBe(404);
    expect((await org.post(`/api/events/${eventA.id}/check-in`).send({ code: "NOT-A-REAL-CODE" })).status).toBe(404);

    await agent.post(`/api/registrations/${reg.id}/cancel`).expect(200);
    const cancelled = await org.post(`/api/events/${eventA.id}/check-in`).send({ code: reg.ticketCode });
    expect(cancelled.status).toBe(409);
  });

  it("only the event's organizer or an admin can check in", async () => {
    const event = await insertEvent(db, organizer.id);
    const { agent } = await studentAgent();
    const reg = (await agent.post(`/api/events/${event.id}/register`)).body.data.registration;

    expect((await agent.post(`/api/events/${event.id}/check-in`).send({ code: reg.ticketCode })).status).toBe(403);
    const other = await loginAs(otherOrganizer.email);
    expect((await other.post(`/api/events/${event.id}/check-in`).send({ code: reg.ticketCode })).status).toBe(403);

    const admin = await createUser(db, "admin");
    const asAdmin = await loginAs(admin.email);
    const res = await asAdmin.post(`/api/events/${event.id}/attendees/${reg.id}/check-in`);
    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe("checked_in");
  });

  it("lists attendees with a check-in summary and exports safe CSV", async () => {
    const event = await insertEvent(db, organizer.id);
    const s = await createUser(db, "student", { name: "=HYPERLINK(\"http://x\")" });
    const agent = await loginAs(s.email);
    await agent.post(`/api/events/${event.id}/register`).expect(201);

    const org = await loginAs(organizer.email);
    const list = await org.get(`/api/events/${event.id}/attendees`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.summary).toMatchObject({ registered: 1, checkedIn: 0 });

    const csv = await org.get(`/api/events/${event.id}/attendees.csv`);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});
