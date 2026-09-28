import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { events, payments, registrations, type User } from "../shared/schema";
import type { Database } from "../server/db";
import { resetConfig } from "../server/config";
import { setOrderClient } from "../server/services/razorpay";
import { app, createUser, insertEvent, loginAs, setupTestDb } from "./helpers";

const KEY_SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";

let db: Database;
let close: () => Promise<void>;
let organizer: User;
let orderSeq = 0;

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
  organizer = await createUser(db, "organizer");
});
afterAll(() => close());

function enablePayments() {
  process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  resetConfig();
  setOrderClient({
    async createOrder(input) {
      orderSeq += 1;
      return { id: `order_test_${orderSeq}`, amount: input.amount, currency: input.currency };
    },
  });
}

function disablePayments() {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  resetConfig();
  setOrderClient(null);
}

const sign = (orderId: string, paymentId: string, secret = KEY_SECRET) =>
  createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

const seats = async (id: number) =>
  (await db.select({ n: events.registeredCount }).from(events).where(eq(events.id, id)))[0].n;

async function student() {
  const s = await createUser(db, "student");
  return { user: s, agent: await loginAs(s.email) };
}

describe("when Razorpay is not configured", () => {
  beforeEach(disablePayments);

  it("refuses paid registrations without holding a seat or faking success", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 25000 });
    const { agent } = await student();
    const res = await agent.post(`/api/events/${event.id}/register`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("PAYMENTS_UNAVAILABLE");
    expect(await seats(event.id)).toBe(0);
  });

  it("reports payments as disabled in public config", async () => {
    const res = await request(app()).get("/api/config");
    expect(res.body.data).toMatchObject({ paymentsEnabled: false, razorpayKeyId: null });
  });
});

describe("with Razorpay configured", () => {
  beforeEach(enablePayments);
  afterEach(disablePayments);

  it("holds a seat, creates an order for the server-side price, and confirms on a valid signature", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 25000 });
    const { agent } = await student();

    const res = await agent.post(`/api/events/${event.id}/register`).send({ amount: 1 });
    expect(res.status).toBe(201);
    const { registration, payment } = res.body.data;
    expect(registration.status).toBe("pending_payment");
    expect(payment).toMatchObject({ amount: 25000, currency: "INR", keyId: "rzp_test_key" });
    expect(await seats(event.id)).toBe(1);

    // Returning to checkout resumes the same order instead of taking another seat.
    const resume = await agent.post(`/api/events/${event.id}/register`);
    expect(resume.body.data.payment.orderId).toBe(payment.orderId);
    expect(await seats(event.id)).toBe(1);

    const forged = await agent.post("/api/payments/verify").send({
      registrationId: registration.id,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: "pay_fake",
      razorpaySignature: "0".repeat(64),
    });
    expect(forged.status).toBe(400);
  });

  it("confirms with a genuine signature and is idempotent", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 10000 });
    const { agent } = await student();
    const { registration, payment } = (await agent.post(`/api/events/${event.id}/register`)).body.data;

    const body = {
      registrationId: registration.id,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: "pay_genuine_1",
      razorpaySignature: sign(payment.orderId, "pay_genuine_1"),
    };
    const ok = await agent.post("/api/payments/verify").send(body);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("confirmed");

    const replay = await agent.post("/api/payments/verify").send(body);
    expect(replay.status).toBe(200);
    expect(await seats(event.id)).toBe(1);

    const [row] = await db.select().from(payments).where(eq(payments.razorpayOrderId, payment.orderId));
    expect(row).toMatchObject({ status: "paid", razorpayPaymentId: "pay_genuine_1", amountInPaise: 10000 });

    const history = await agent.get("/api/me/payments");
    expect(history.body.data[0]).toMatchObject({ status: "paid", event: { id: event.id } });

    // Paid tickets can't be self-cancelled online.
    expect((await agent.post(`/api/registrations/${registration.id}/cancel`)).status).toBe(409);
  });

  it("does not let another user verify someone else's order", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 10000 });
    const owner = await student();
    const { registration, payment } = (await owner.agent.post(`/api/events/${event.id}/register`)).body.data;
    const thief = await student();
    const res = await thief.agent.post("/api/payments/verify").send({
      registrationId: registration.id,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: "pay_x",
      razorpaySignature: sign(payment.orderId, "pay_x"),
    });
    expect(res.status).toBe(404);
  });

  it("releases the seat when checkout is abandoned or the hold expires", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 10000, capacity: 1 });
    const first = await student();
    const { registration } = (await first.agent.post(`/api/events/${event.id}/register`)).body.data;
    expect(await seats(event.id)).toBe(1);

    const second = await student();
    expect((await second.agent.post(`/api/events/${event.id}/register`)).status).toBe(409);

    const abandon = await first.agent.post("/api/payments/abandon").send({ registrationId: registration.id });
    expect(abandon.body.data.status).toBe("expired");
    expect(await seats(event.id)).toBe(0);

    const held = (await second.agent.post(`/api/events/${event.id}/register`)).body.data.registration;
    await db.update(registrations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(registrations.id, held.id));
    const third = await student();
    expect((await third.agent.post(`/api/events/${event.id}/register`)).status).toBe(201);
    expect(await seats(event.id)).toBe(1);
  });

  it("confirms payments through a signed webhook and rejects unsigned ones", async () => {
    const event = await insertEvent(db, organizer.id, { priceInPaise: 10000 });
    const { agent } = await student();
    const { registration, payment } = (await agent.post(`/api/events/${event.id}/register`)).body.data;

    const payload = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_webhook_1", order_id: payment.orderId } } },
    });
    const unsigned = await request(app())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", "bad")
      .send(payload);
    expect(unsigned.status).toBe(401);

    const signature = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
    const signed = await request(app())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .send(payload);
    expect(signed.status).toBe(200);

    const ticket = await agent.get(`/api/registrations/${registration.id}`);
    expect(ticket.body.data.status).toBe("confirmed");
  });
});
