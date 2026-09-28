import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { events, payments, registrations, users } from "../../shared/schema";
import type { PaymentRecord, TicketView } from "../../shared/api";
import { currentUser, requireAuth } from "../auth";
import { getDb } from "../db";
import { asyncHandler, notFound, parseId } from "../errors";
import { canManageEvent, organizerColumns, toEventSummary, toRegistrationSummary } from "../services/events";
import { cancelRegistration, releaseExpiredHolds } from "../services/registrations";

export const meRouter = Router();
export const registrationsRouter = Router();

meRouter.use(requireAuth);

meRouter.get(
  "/registrations",
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const db = getDb();
    await releaseExpiredHolds(db);
    const rows = await db
      .select({ registration: registrations, event: events, organizer: organizerColumns })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .innerJoin(users, eq(users.id, events.organizerId))
      .where(
        and(eq(registrations.userId, me.id), inArray(registrations.status, ["pending_payment", "confirmed", "cancelled"])),
      )
      .orderBy(desc(events.startAt));

    const data: TicketView[] = rows.map((r) => ({
      ...toRegistrationSummary(r.registration),
      event: toEventSummary(r.event, r.organizer),
      attendee: { id: me.id, name: me.name, email: me.email },
    }));
    res.json({ data });
  }),
);

meRouter.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const rows = await getDb()
      .select({ payment: payments, event: { id: events.id, title: events.title } })
      .from(payments)
      .innerJoin(registrations, eq(registrations.id, payments.registrationId))
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(payments.userId, currentUser(req).id))
      .orderBy(desc(payments.createdAt));

    const data: PaymentRecord[] = rows.map(({ payment: p, event }) => ({
      id: p.id,
      registrationId: p.registrationId,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      amountInPaise: p.amountInPaise,
      currency: p.currency,
      status: p.status,
      failureReason: p.failureReason,
      createdAt: p.createdAt.toISOString(),
      event,
    }));
    res.json({ data });
  }),
);

registrationsRouter.use(requireAuth);

/** Loads a registration the user may see: their own, or any for an event they manage. */
async function loadVisibleRegistration(id: number, req: Parameters<typeof currentUser>[0]) {
  const me = currentUser(req);
  const [row] = await getDb()
    .select({
      registration: registrations,
      event: events,
      organizer: organizerColumns,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(eq(registrations.id, id))
    .limit(1);

  // Report "not found" for other people's tickets so IDs can't be probed.
  if (!row || (row.registration.userId !== me.id && !canManageEvent(me, row.event))) {
    throw notFound("Ticket not found.");
  }
  return row;
}

registrationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await loadVisibleRegistration(parseId(req.params.id, "ticket id"), req);
    const [attendee] = await getDb()
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, row.registration.userId))
      .limit(1);
    const data: TicketView = {
      ...toRegistrationSummary(row.registration),
      event: toEventSummary(row.event, row.organizer),
      attendee,
    };
    res.json({ data });
  }),
);

registrationsRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const id = parseId(req.params.id, "ticket id");
    const row = await loadVisibleRegistration(id, req);
    // Organizers can view attendee tickets but only the student or an admin may cancel them.
    if (row.registration.userId !== me.id && me.role !== "admin") throw notFound("Ticket not found.");
    await cancelRegistration(getDb(), row.registration, row.event, me);
    const [updated] = await getDb().select().from(registrations).where(eq(registrations.id, id)).limit(1);
    res.json({ data: toRegistrationSummary(updated) });
  }),
);
