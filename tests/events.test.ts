import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { User } from "../shared/schema";
import type { Database } from "../server/db";
import { app, createUser, eventPayload, hours, insertEvent, loginAs, setupTestDb } from "./helpers";

let db: Database;
let close: () => Promise<void>;
let organizer: User;
let otherOrganizer: User;
let student: User;
let admin: User;

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
  organizer = await createUser(db, "organizer");
  otherOrganizer = await createUser(db, "organizer");
  student = await createUser(db, "student");
  admin = await createUser(db, "admin");
});
afterAll(() => close());

describe("creating events", () => {
  it("is limited to organizers and admins", async () => {
    expect((await request(app()).post("/api/events").send(eventPayload())).status).toBe(401);
    const asStudent = await loginAs(student.email);
    expect((await asStudent.post("/api/events").send(eventPayload())).status).toBe(403);
  });

  it("creates a draft owned by the organizer, ignoring client-supplied ownership and counts", async () => {
    const agent = await loginAs(organizer.email);
    const res = await agent
      .post("/api/events")
      .send(eventPayload({ organizerId: otherOrganizer.id, registeredCount: 40, status: "published" }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "draft", registeredCount: 0, organizer: { id: organizer.id } });
  });

  it("validates the timeline and fields", async () => {
    const agent = await loginAs(organizer.email);
    const endBeforeStart = await agent.post("/api/events").send(eventPayload({ endAt: hours(1).toISOString() }));
    expect(endBeforeStart.status).toBe(400);
    expect(endBeforeStart.body.error.fields.endAt).toBeDefined();

    const deadlineAfterStart = await agent
      .post("/api/events")
      .send(eventPayload({ registrationDeadline: hours(80).toISOString() }));
    expect(deadlineAfterStart.status).toBe(400);

    const past = await agent.post("/api/events").send(
      eventPayload({ startAt: hours(-5).toISOString(), endAt: hours(-4).toISOString(), registrationDeadline: hours(-6).toISOString() }),
    );
    expect(past.status).toBe(400);

    const badCategory = await agent.post("/api/events").send(eventPayload({ category: "Party" }));
    expect(badCategory.status).toBe(400);

    const zeroCapacity = await agent.post("/api/events").send(eventPayload({ capacity: 0 }));
    expect(zeroCapacity.status).toBe(400);
  });
});

describe("visibility and browsing", () => {
  it("hides drafts from the public but shows them to their organizer", async () => {
    const draft = await insertEvent(db, organizer.id, { status: "draft", title: "Secret Draft" });
    expect((await request(app()).get(`/api/events/${draft.id}`)).status).toBe(404);
    const other = await loginAs(otherOrganizer.email);
    expect((await other.get(`/api/events/${draft.id}`)).status).toBe(404);
    const owner = await loginAs(organizer.email);
    const res = await owner.get(`/api/events/${draft.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.canManage).toBe(true);

    const list = await request(app()).get("/api/events?search=Secret");
    expect(list.body.data).toHaveLength(0);
  });

  it("lists, searches and filters published events with pagination", async () => {
    await insertEvent(db, organizer.id, { title: "Quantum Computing Seminar", category: "Seminar" });
    await insertEvent(db, organizer.id, { title: "Hackathon Finals", category: "Hackathon", priceInPaise: 5000 });

    const search = await request(app()).get("/api/events?search=quantum");
    expect(search.status).toBe(200);
    expect(search.body.data.map((e: { title: string }) => e.title)).toEqual(["Quantum Computing Seminar"]);

    const paid = await request(app()).get("/api/events?price=paid");
    expect(paid.body.data.every((e: { priceInPaise: number }) => e.priceInPaise > 0)).toBe(true);

    const byCategory = await request(app()).get("/api/events?category=Hackathon");
    expect(byCategory.body.data.map((e: { title: string }) => e.title)).toContain("Hackathon Finals");

    const page = await request(app()).get("/api/events?pageSize=1&page=1");
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it("treats LIKE wildcards in search literally", async () => {
    const res = await request(app()).get("/api/events?search=%25");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 404 for missing events and 400 for malformed ids", async () => {
    expect((await request(app()).get("/api/events/999999")).status).toBe(404);
    expect((await request(app()).get("/api/events/abc")).status).toBe(400);
  });
});

describe("managing events", () => {
  it("prevents organizers from editing other organizers' events", async () => {
    const event = await insertEvent(db, organizer.id);
    const other = await loginAs(otherOrganizer.email);
    expect((await other.patch(`/api/events/${event.id}`).send({ title: "Hijacked title" })).status).toBe(403);
    expect((await other.post(`/api/events/${event.id}/status`).send({ status: "cancelled" })).status).toBe(403);
    expect((await other.delete(`/api/events/${event.id}`)).status).toBe(403);
    expect((await other.get(`/api/events/${event.id}/attendees`)).status).toBe(403);
  });

  it("lets the owner and admins edit", async () => {
    const event = await insertEvent(db, organizer.id);
    const owner = await loginAs(organizer.email);
    const res = await owner.patch(`/api/events/${event.id}`).send({ title: "Renamed by owner", capacity: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "Renamed by owner", capacity: 20 });

    const asAdmin = await loginAs(admin.email);
    expect((await asAdmin.patch(`/api/events/${event.id}`).send({ venue: "Admin Hall" })).status).toBe(200);
  });

  it("rejects partial updates that break the stored timeline", async () => {
    const event = await insertEvent(db, organizer.id);
    const owner = await loginAs(organizer.email);
    const res = await owner.patch(`/api/events/${event.id}`).send({ endAt: hours(1).toISOString() });
    expect(res.status).toBe(400);
  });

  it("publishes, unpublishes and cancels with guards", async () => {
    const owner = await loginAs(organizer.email);
    const created = await owner.post("/api/events").send(eventPayload());
    const id = created.body.data.id;
    expect((await owner.post(`/api/events/${id}/status`).send({ status: "published" })).body.data.status).toBe("published");
    expect((await request(app()).get(`/api/events/${id}`)).status).toBe(200);
    expect((await owner.post(`/api/events/${id}/status`).send({ status: "draft" })).body.data.status).toBe("draft");
    expect((await owner.post(`/api/events/${id}/status`).send({ status: "cancelled" })).body.data.status).toBe("cancelled");
    expect((await owner.post(`/api/events/${id}/status`).send({ status: "published" })).status).toBe(409);
    expect((await owner.patch(`/api/events/${id}`).send({ title: "Edit after cancel" })).status).toBe(409);
  });

  it("blocks capacity below registrations, price changes and deletion once students registered", async () => {
    const event = await insertEvent(db, organizer.id, { capacity: 5 });
    const s = await createUser(db, "student");
    const studentAgent = await loginAs(s.email);
    expect((await studentAgent.post(`/api/events/${event.id}/register`)).status).toBe(201);

    const owner = await loginAs(organizer.email);
    expect((await owner.patch(`/api/events/${event.id}`).send({ capacity: 0 })).status).toBe(400);
    expect((await owner.patch(`/api/events/${event.id}`).send({ priceInPaise: 10000 })).status).toBe(409);
    expect((await owner.delete(`/api/events/${event.id}`)).status).toBe(409);
    expect((await owner.post(`/api/events/${event.id}/status`).send({ status: "draft" })).status).toBe(409);
  });

  it("deletes events without registrations", async () => {
    const event = await insertEvent(db, organizer.id);
    const owner = await loginAs(organizer.email);
    expect((await owner.delete(`/api/events/${event.id}`)).status).toBe(204);
    expect((await request(app()).get(`/api/events/${event.id}`)).status).toBe(404);
  });
});

describe("event images", () => {
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
    "hex",
  );

  it("accepts real images from the owner and serves them", async () => {
    const event = await insertEvent(db, organizer.id);
    const owner = await loginAs(organizer.email);
    const res = await owner.put(`/api/events/${event.id}/image`).set("Content-Type", "image/png").send(png);
    expect(res.status).toBe(200);
    expect(res.body.data.imageUrl).toMatch(new RegExp(`^/api/events/${event.id}/image\\?v=`));

    const image = await request(app()).get(res.body.data.imageUrl);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
  });

  it("rejects files whose bytes are not an image, whatever the declared type", async () => {
    const event = await insertEvent(db, organizer.id);
    const owner = await loginAs(organizer.email);
    const res = await owner
      .put(`/api/events/${event.id}/image`)
      .set("Content-Type", "image/png")
      .send(Buffer.from("<svg onload=alert(1)>"));
    expect(res.status).toBe(415);

    const other = await loginAs(otherOrganizer.email);
    expect((await other.put(`/api/events/${event.id}/image`).set("Content-Type", "image/png").send(png)).status).toBe(403);
  });
});
