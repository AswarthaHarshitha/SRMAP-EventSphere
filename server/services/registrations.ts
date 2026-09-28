import { randomInt } from "node:crypto";
import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { events, payments, registrations, users, type Event, type Registration, type User } from "../../shared/schema";
import { PAYMENT_HOLD_MINUTES, TICKET_QR_PREFIX } from "../../shared/constants";
import type { Attendee, RegisterResult } from "../../shared/api";
import type { Database } from "../db";
import { conflict, forbidden, HttpError, notFound } from "../errors";
import { config } from "../config";
import { orderClient } from "./razorpay";
import { sendRegistrationConfirmation } from "./email";
import { registrationState, toRegistrationSummary } from "./events";

// Crockford base32 without ambiguous characters; 20 characters ≈ 100 bits of entropy.
const TICKET_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateTicketCode() {
  let code = "";
  for (let i = 0; i < 20; i++) code += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  return code;
}

/** Accepts raw QR payloads and hand-typed codes (any case, with spaces or dashes). */
export function normalizeTicketCode(input: string) {
  let value = input.trim();
  if (value.toUpperCase().startsWith(TICKET_QR_PREFIX)) value = value.slice(TICKET_QR_PREFIX.length);
  return value.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Expires unpaid seat holds whose payment window has passed and returns their seats to the pool.
 * Runs as a single statement so counts and statuses never diverge.
 */
export async function releaseExpiredHolds(db: Database, eventId?: number) {
  const scope = eventId === undefined ? sql`` : sql`and event_id = ${eventId}`;
  await db.execute(sql`
    with expired as (
      update registrations set status = 'expired', updated_at = now()
      where status = 'pending_payment' and expires_at < now() ${scope}
      returning event_id
    ), counts as (
      select event_id, count(*)::int as n from expired group by event_id
    )
    update events set registered_count = greatest(events.registered_count - counts.n, 0), updated_at = now()
    from counts where events.id = counts.event_id`);
}

function closedMessage(event: Event) {
  switch (registrationState(event)) {
    case "cancelled":
      return "This event has been cancelled.";
    case "not_published":
      return "This event is not open for registration.";
    case "started":
      return "This event has already started.";
    case "closed":
      return "Registration for this event has closed.";
    case "full":
      return "This event is full.";
    default:
      return "Registration is not available for this event.";
  }
}

async function reserveSeat(db: Database, eventId: number) {
  const now = new Date();
  const [event] = await db
    .update(events)
    .set({ registeredCount: sql`${events.registeredCount} + 1` })
    .where(
      and(
        eq(events.id, eventId),
        eq(events.status, "published"),
        lt(events.registeredCount, events.capacity),
        gt(events.registrationDeadline, now),
        gt(events.startAt, now),
      ),
    )
    .returning();
  return event ?? null;
}

async function releaseSeat(db: Database, eventId: number) {
  await db
    .update(events)
    .set({ registeredCount: sql`greatest(${events.registeredCount} - 1, 0)` })
    .where(eq(events.id, eventId));
}

export async function registerForEvent(db: Database, user: User, eventId: number): Promise<RegisterResult> {
  if (user.role !== "student") throw forbidden("Only student accounts can register for events.");

  await releaseExpiredHolds(db, eventId);

  const [existing] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.userId, user.id),
        inArray(registrations.status, ["pending_payment", "confirmed"]),
      ),
    )
    .limit(1);

  if (existing?.status === "confirmed") throw conflict("You are already registered for this event.");
  if (existing?.status === "pending_payment") {
    // Resume the student's unfinished checkout instead of creating a second hold.
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.registrationId, existing.id), eq(payments.status, "created")))
      .limit(1);
    if (payment) {
      return {
        registration: toRegistrationSummary(existing),
        payment: {
          orderId: payment.razorpayOrderId,
          amount: payment.amountInPaise,
          currency: payment.currency,
          keyId: config().razorpay.keyId!,
        },
      };
    }
    // The order behind this hold failed; drop the hold and start a fresh checkout.
    await releaseRegistration(db, existing, "expired");
  }

  const [target] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!target || target.status === "draft") throw notFound("Event not found.");
  const isPaid = target.priceInPaise > 0;
  // Fail before holding a seat when payments cannot be taken.
  const payments_ = isPaid ? orderClient() : null;

  const registration = await db
    .transaction(async (tx) => {
    const event = await reserveSeat(tx as unknown as Database, eventId);
    if (!event) throw conflict(closedMessage(target));

    const [created] = await tx
      .insert(registrations)
      .values({
        eventId,
        userId: user.id,
        status: isPaid ? "pending_payment" : "confirmed",
        ticketCode: generateTicketCode(),
        amountInPaise: event.priceInPaise,
        expiresAt: isPaid ? new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000) : null,
      })
      .returning();
    return created;
    })
    .catch((err) => {
      // Two simultaneous requests: the partial unique index lets only one through.
      if ((err as { code?: string }).code === "23505" || (err as { cause?: { code?: string } }).cause?.code === "23505") {
        throw conflict("You are already registered for this event.");
      }
      throw err;
    });

  if (!payments_) {
    await sendRegistrationConfirmation({
      to: user.email,
      name: user.name,
      eventTitle: target.title,
      venue: target.venue,
      startAt: target.startAt,
      ticketCode: registration.ticketCode,
      registrationId: registration.id,
    });
    return { registration: toRegistrationSummary(registration), payment: null };
  }

  try {
    const order = await payments_.createOrder({
      amount: registration.amountInPaise,
      currency: "INR",
      receipt: `reg_${registration.id}`,
      notes: { registrationId: String(registration.id), eventId: String(eventId), userId: String(user.id) },
    });
    await db.insert(payments).values({
      registrationId: registration.id,
      userId: user.id,
      razorpayOrderId: order.id,
      amountInPaise: registration.amountInPaise,
      currency: order.currency,
    });
    return {
      registration: toRegistrationSummary(registration),
      payment: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: config().razorpay.keyId! },
    };
  } catch (err) {
    await releaseRegistration(db, registration, "expired");
    console.error("[payments] order creation failed:", (err as Error).message);
    throw new HttpError(502, "PAYMENT_ORDER_FAILED", "We couldn't start the payment. Please try again.");
  }
}

/** Moves an active registration to cancelled/expired and returns its seat. Safe against double calls. */
async function releaseRegistration(db: Database, registration: Registration, status: "cancelled" | "expired") {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(registrations)
      .set({ status, cancelledAt: status === "cancelled" ? new Date() : null, expiresAt: null })
      .where(
        and(eq(registrations.id, registration.id), inArray(registrations.status, ["pending_payment", "confirmed"])),
      )
      .returning();
    if (updated) await releaseSeat(tx as unknown as Database, registration.eventId);
  });
}

/**
 * Marks a Razorpay order as paid and confirms its registration. Idempotent: repeated calls from
 * the checkout callback and the webhook produce a single confirmation.
 */
export async function confirmPayment(db: Database, input: { orderId: string; paymentId: string }) {
  return db.transaction(async (txRaw) => {
    const tx = txRaw as unknown as Database;
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, input.orderId))
      .for("update")
      .limit(1);
    if (!payment) throw notFound("Payment order not found.");

    const [registration] = await tx
      .select()
      .from(registrations)
      .where(eq(registrations.id, payment.registrationId))
      .for("update")
      .limit(1);

    if (payment.status === "paid") {
      if (payment.razorpayPaymentId !== input.paymentId) throw conflict("This order has already been paid.");
      return registration;
    }

    let confirmed = registration;
    let failureReason: string | null = null;

    if (registration.status === "pending_payment") {
      [confirmed] = await tx
        .update(registrations)
        .set({ status: "confirmed", expiresAt: null })
        .where(eq(registrations.id, registration.id))
        .returning();
    } else if (registration.status !== "confirmed") {
      // The hold lapsed before the payment arrived; take a seat again if one is still free.
      const [seat] = await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} + 1` })
        .where(
          and(
            eq(events.id, registration.eventId),
            eq(events.status, "published"),
            lt(events.registeredCount, events.capacity),
          ),
        )
        .returning({ id: events.id });
      if (seat) {
        [confirmed] = await tx
          .update(registrations)
          .set({ status: "confirmed", expiresAt: null, cancelledAt: null })
          .where(eq(registrations.id, registration.id))
          .returning();
      } else {
        failureReason = "Payment received after the seat hold expired and the event is full. A refund is required.";
      }
    }

    await tx
      .update(payments)
      .set({ status: "paid", razorpayPaymentId: input.paymentId, failureReason })
      .where(eq(payments.id, payment.id));

    if (failureReason) {
      throw conflict("Your payment was received but the event filled up. The organizer will arrange a refund.");
    }
    return confirmed;
  });
}

export async function markPaymentFailed(db: Database, orderId: string, reason: string) {
  const [payment] = await db
    .update(payments)
    .set({ status: "failed", failureReason: reason.slice(0, 300) })
    .where(and(eq(payments.razorpayOrderId, orderId), eq(payments.status, "created")))
    .returning();
  return payment ?? null;
}

/** Student closed or failed the checkout: release the hold immediately. */
export async function abandonPayment(db: Database, user: User, registrationId: number, reason?: string) {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  if (!registration || registration.userId !== user.id) throw notFound("Registration not found.");
  if (registration.status !== "pending_payment") return toRegistrationSummary(registration);

  await releaseRegistration(db, registration, "expired");
  await db
    .update(payments)
    .set({ status: "failed", failureReason: (reason || "Payment was not completed").slice(0, 300) })
    .where(and(eq(payments.registrationId, registrationId), eq(payments.status, "created")));

  const [updated] = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  return toRegistrationSummary(updated);
}

export async function cancelRegistration(
  db: Database,
  registration: Registration,
  event: Event,
  actor: User,
) {
  const isAdmin = actor.role === "admin";
  if (registration.status !== "confirmed" && registration.status !== "pending_payment") {
    throw conflict("This registration is no longer active.");
  }
  if (registration.checkedInAt) throw conflict("Checked-in registrations cannot be cancelled.");
  if (!isAdmin) {
    if (registration.amountInPaise > 0) {
      throw conflict("Paid registrations can't be cancelled online. Please contact the organizer for a refund.");
    }
    if (new Date() >= event.startAt) throw conflict("The event has already started.");
  }
  await releaseRegistration(db, registration, "cancelled");
}

export function toAttendee(
  r: Registration,
  u: { id: number; name: string; email: string; department: string | null },
): Attendee {
  return {
    registrationId: r.id,
    status: r.status,
    ticketCode: r.ticketCode,
    amountInPaise: r.amountInPaise,
    checkedInAt: r.checkedInAt?.toISOString() ?? null,
    registeredAt: r.createdAt.toISOString(),
    user: u,
  };
}

/**
 * Checks a ticket in. The conditional update makes concurrent or repeated scans safe:
 * exactly one scan records the check-in; later scans report the original time.
 */
export async function checkInTicket(
  db: Database,
  event: Event,
  actor: User,
  match: { code: string } | { registrationId: number },
) {
  if (event.status === "cancelled") throw conflict("This event has been cancelled.");

  const where =
    "code" in match
      ? eq(registrations.ticketCode, normalizeTicketCode(match.code))
      : eq(registrations.id, match.registrationId);

  const [row] = await db
    .select({ registration: registrations, user: { id: users.id, name: users.name, email: users.email, department: users.department } })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .where(where)
    .limit(1);

  // Tickets for other events are reported as invalid rather than revealing where they belong.
  if (!row || row.registration.eventId !== event.id) {
    throw new HttpError(404, "TICKET_NOT_FOUND", "This ticket is not valid for this event.");
  }
  if (row.registration.status !== "confirmed") {
    const reason =
      row.registration.status === "pending_payment"
        ? "Payment for this ticket is not complete."
        : "This ticket has been cancelled.";
    throw new HttpError(409, "TICKET_INACTIVE", reason);
  }

  const [updated] = await db
    .update(registrations)
    .set({ checkedInAt: new Date(), checkedInBy: actor.id })
    .where(and(eq(registrations.id, row.registration.id), isNull(registrations.checkedInAt)))
    .returning();

  return {
    outcome: updated ? ("checked_in" as const) : ("already_checked_in" as const),
    attendee: toAttendee(updated ?? row.registration, row.user),
    event: { id: event.id, title: event.title },
  };
}
