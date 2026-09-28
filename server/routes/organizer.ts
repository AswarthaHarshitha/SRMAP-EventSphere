import { Router } from "express";
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, sum } from "drizzle-orm";
import { events, payments, registrations } from "../../shared/schema";
import type { OrganizerEventRow, OrganizerStats } from "../../shared/api";
import { currentUser, requireAuth, requireRole } from "../auth";
import { getDb } from "../db";
import { asyncHandler } from "../errors";
import { toEventSummary } from "../services/events";

export const organizerRouter = Router();
organizerRouter.use(requireAuth, requireRole("organizer", "admin"));

organizerRouter.get(
  "/events",
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const db = getDb();
    const rows = await db.select().from(events).where(eq(events.organizerId, me.id)).orderBy(desc(events.startAt));

    const ids = rows.map((e) => e.id);
    const checkIns = ids.length
      ? await db
          .select({ eventId: registrations.eventId, n: count() })
          .from(registrations)
          .where(and(inArray(registrations.eventId, ids), isNotNull(registrations.checkedInAt)))
          .groupBy(registrations.eventId)
      : [];
    const byEvent = new Map(checkIns.map((c) => [c.eventId, c.n]));

    const organizer = { id: me.id, name: me.name, department: me.department };
    const data: OrganizerEventRow[] = rows.map((e) => ({
      ...toEventSummary(e, organizer),
      checkedInCount: byEvent.get(e.id) ?? 0,
    }));
    res.json({ data });
  }),
);

organizerRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const db = getDb();
    const mine = eq(events.organizerId, me.id);

    const [[eventCounts], [published], [upcoming], [regs], [checkIns], [revenue]] = await Promise.all([
      db.select({ n: count() }).from(events).where(mine),
      db.select({ n: count() }).from(events).where(and(mine, eq(events.status, "published"))),
      db.select({ n: count() }).from(events).where(and(mine, eq(events.status, "published"), gt(events.startAt, new Date()))),
      db
        .select({ n: count() })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(and(mine, eq(registrations.status, "confirmed"))),
      db
        .select({ n: count() })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(and(mine, isNotNull(registrations.checkedInAt))),
      db
        .select({ total: sum(payments.amountInPaise) })
        .from(payments)
        .innerJoin(registrations, eq(registrations.id, payments.registrationId))
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(and(mine, eq(payments.status, "paid"), isNull(payments.failureReason))),
    ]);

    const data: OrganizerStats = {
      totalEvents: eventCounts.n,
      publishedEvents: published.n,
      upcomingEvents: upcoming.n,
      totalRegistrations: regs.n,
      totalCheckIns: checkIns.n,
      revenueInPaise: Number(revenue.total ?? 0),
    };
    res.json({ data });
  }),
);
