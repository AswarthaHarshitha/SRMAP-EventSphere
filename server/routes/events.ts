import express, { Router } from "express";
import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, lt, or, type SQL } from "drizzle-orm";
import { eventImages, events, registrations, users } from "../../shared/schema";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../../shared/constants";
import type { EventDetail } from "../../shared/api";
import {
  checkInSchema,
  eventInputSchema,
  eventListQuerySchema,
  eventStatusSchema,
  eventUpdateSchema,
  paginationSchema,
} from "../../shared/validation";
import { currentUser, optionalAuth, requireAuth, requireRole } from "../auth";
import { getDb } from "../db";
import { escapeLike, paged } from "../pagination";
import { asyncHandler, badRequest, conflict, HttpError, notFound, parseId } from "../errors";
import {
  canManageEvent,
  findEventWithOrganizer,
  loadManagedEvent,
  organizerColumns,
  toEventSummary,
  toRegistrationSummary,
} from "../services/events";
import { checkInTicket, registerForEvent, releaseExpiredHolds, toAttendee } from "../services/registrations";

export const eventsRouter = Router();


// ---------- Public browsing ----------

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = eventListQuerySchema.parse(req.query);
    const now = new Date();
    const filters: SQL[] = [eq(events.status, "published")];
    if (q.when === "upcoming") filters.push(gt(events.endAt, now));
    if (q.when === "past") filters.push(lt(events.endAt, now));
    if (q.category) filters.push(eq(events.category, q.category));
    if (q.price === "free") filters.push(eq(events.priceInPaise, 0));
    if (q.price === "paid") filters.push(gt(events.priceInPaise, 0));
    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      filters.push(or(ilike(events.title, term), ilike(events.venue, term), ilike(events.description, term))!);
    }
    const where = and(...filters);
    const db = getDb();

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ event: events, organizer: organizerColumns })
        .from(events)
        .innerJoin(users, eq(users.id, events.organizerId))
        .where(where)
        .orderBy(q.when === "past" ? desc(events.startAt) : asc(events.startAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: count() }).from(events).where(where),
    ]);

    res.json(paged(rows.map((r) => toEventSummary(r.event, r.organizer)), total, q.page, q.pageSize));
  }),
);

eventsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "event id");
    const db = getDb();
    await releaseExpiredHolds(db, id);

    const row = await findEventWithOrganizer(db, id);
    const canManage = !!row && canManageEvent(req.user, row.event);
    if (!row || (row.event.status === "draft" && !canManage)) throw notFound("Event not found.");

    let myRegistration: EventDetail["myRegistration"] = null;
    if (req.user) {
      const [mine] = await db
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, id),
            eq(registrations.userId, req.user.id),
            inArray(registrations.status, ["pending_payment", "confirmed"]),
          ),
        )
        .limit(1);
      myRegistration = mine ? toRegistrationSummary(mine) : null;
    }

    const detail: EventDetail = { ...toEventSummary(row.event, row.organizer), myRegistration, canManage };
    res.json({ data: detail });
  }),
);

eventsRouter.get(
  "/:id/image",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "event id");
    const [row] = await getDb()
      .select({ mimeType: eventImages.mimeType, data: eventImages.data, status: events.status, organizerId: events.organizerId })
      .from(eventImages)
      .innerJoin(events, eq(events.id, eventImages.eventId))
      .where(eq(eventImages.eventId, id))
      .limit(1);
    if (!row) throw notFound("Image not found.");
    const isDraft = row.status === "draft";
    if (isDraft && !(req.user && (req.user.role === "admin" || req.user.id === row.organizerId))) {
      throw notFound("Image not found.");
    }
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    // The URL carries a version parameter, so published images can be cached aggressively.
    res.setHeader("Cache-Control", isDraft ? "private, no-store" : "public, max-age=31536000, immutable");
    res.send(row.data);
  }),
);

// ---------- Organizer: create & manage ----------

function assertFuture(date: Date, label: string) {
  if (date <= new Date()) throw badRequest(`${label} must be in the future.`);
}

eventsRouter.post(
  "/",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const input = eventInputSchema.parse(req.body);
    assertFuture(input.startAt, "Start time");
    assertFuture(input.registrationDeadline, "Registration deadline");

    const me = currentUser(req);
    const [event] = await getDb()
      .insert(events)
      .values({ ...input, organizerId: me.id, status: "draft" })
      .returning();
    res.status(201).json({ data: toEventSummary(event, { id: me.id, name: me.name, department: me.department }) });
  }),
);

eventsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event, organizer } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    if (event.status === "cancelled") throw conflict("Cancelled events can't be edited.");

    const changes = eventUpdateSchema.parse(req.body);
    const merged = { ...event, ...changes };
    // Re-validate the combined timeline, since a partial update can conflict with stored values.
    eventInputSchema.parse(merged);

    if (changes.startAt && changes.startAt.getTime() !== event.startAt.getTime()) assertFuture(changes.startAt, "Start time");
    if (changes.capacity !== undefined && changes.capacity < event.registeredCount) {
      throw badRequest(`Capacity can't be lower than the ${event.registeredCount} seats already taken.`, {
        capacity: "Below current registrations",
      });
    }
    if (changes.priceInPaise !== undefined && changes.priceInPaise !== event.priceInPaise) {
      const [{ n }] = await db.select({ n: count() }).from(registrations).where(eq(registrations.eventId, event.id));
      if (n > 0) throw conflict("The price can't change once students have registered.");
    }

    const [updated] = await db.update(events).set(changes).where(eq(events.id, event.id)).returning();
    res.json({ data: toEventSummary(updated, organizer) });
  }),
);

eventsRouter.post(
  "/:id/status",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event, organizer } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    const { status } = eventStatusSchema.parse(req.body);

    if (status === event.status) return res.json({ data: toEventSummary(event, organizer) });
    if (event.status === "cancelled") throw conflict("Cancelled events can't be reopened.");
    if (status === "published") assertFuture(event.startAt, "The event start time");
    if (status === "draft" && event.registeredCount > 0) {
      throw conflict("This event already has registrations. Cancel it instead of unpublishing.");
    }

    const [updated] = await db.update(events).set({ status }).where(eq(events.id, event.id)).returning();
    res.json({ data: toEventSummary(updated, organizer) });
  }),
);

eventsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    const [{ n }] = await db.select({ n: count() }).from(registrations).where(eq(registrations.eventId, event.id));
    if (n > 0) throw conflict("Events with registrations can't be deleted. Cancel the event instead.");
    await db.delete(events).where(eq(events.id, event.id));
    res.status(204).end();
  }),
);

function detectImageType(data: Buffer): string | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

eventsRouter.put(
  "/:id/image",
  requireAuth,
  requireRole("organizer", "admin"),
  express.raw({ type: [...ALLOWED_IMAGE_TYPES], limit: MAX_IMAGE_BYTES }),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event, organizer } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    const data = req.body;
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Upload a JPEG, PNG or WebP image.");
    }
    // Trust the file's bytes, not the declared Content-Type.
    const mimeType = detectImageType(data);
    if (!mimeType) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Upload a JPEG, PNG or WebP image.");

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      await tx
        .insert(eventImages)
        .values({ eventId: event.id, mimeType, data, updatedAt: now })
        .onConflictDoUpdate({ target: eventImages.eventId, set: { mimeType, data, updatedAt: now } });
      const [row] = await tx.update(events).set({ imageUpdatedAt: now }).where(eq(events.id, event.id)).returning();
      return row;
    });
    res.json({ data: toEventSummary(updated, organizer) });
  }),
);

eventsRouter.delete(
  "/:id/image",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event, organizer } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    await db.delete(eventImages).where(eq(eventImages.eventId, event.id));
    const [updated] = await db.update(events).set({ imageUpdatedAt: null }).where(eq(events.id, event.id)).returning();
    res.json({ data: toEventSummary(updated, organizer) });
  }),
);

// ---------- Student registration ----------

eventsRouter.post(
  "/:id/register",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await registerForEvent(getDb(), currentUser(req), parseId(req.params.id, "event id"));
    res.status(201).json({ data: result });
  }),
);

// ---------- Attendees & check-in ----------

async function attendeeRows(eventId: number, search?: string, limit?: number, offset?: number) {
  const filters: SQL[] = [eq(registrations.eventId, eventId), inArray(registrations.status, ["confirmed", "pending_payment", "cancelled"])];
  if (search) {
    const term = `%${escapeLike(search)}%`;
    filters.push(or(ilike(users.name, term), ilike(users.email, term), ilike(registrations.ticketCode, term))!);
  }
  const where = and(...filters);
  const db = getDb();
  const query = db
    .select({ registration: registrations, user: { id: users.id, name: users.name, email: users.email, department: users.department } })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .where(where)
    .orderBy(desc(registrations.createdAt));
  const rows = limit === undefined ? await query : await query.limit(limit).offset(offset ?? 0);
  const [{ total }] = await db
    .select({ total: count() })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .where(where);
  return { rows, total };
}

eventsRouter.get(
  "/:id/attendees",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { event } = await loadManagedEvent(db, parseId(req.params.id, "event id"), currentUser(req));
    const q = paginationSchema.parse(req.query);
    const { rows, total } = await attendeeRows(event.id, q.search, q.pageSize, (q.page - 1) * q.pageSize);
    const [{ checkedIn }] = await db
      .select({ checkedIn: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, event.id), isNotNull(registrations.checkedInAt)));
    res.json({
      ...paged(rows.map((r) => toAttendee(r.registration, r.user)), total, q.page, q.pageSize),
      summary: { registered: event.registeredCount, capacity: event.capacity, checkedIn },
    });
  }),
);

const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

eventsRouter.get(
  "/:id/attendees.csv",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const { event } = await loadManagedEvent(getDb(), parseId(req.params.id, "event id"), currentUser(req));
    const { rows } = await attendeeRows(event.id);
    const header = ["Name", "Email", "Department", "Status", "Ticket code", "Amount (INR)", "Registered at", "Checked in at"];
    const lines = rows.map(({ registration: r, user: u }) =>
      [u.name, u.email, u.department, r.status, r.ticketCode, (r.amountInPaise / 100).toFixed(2), r.createdAt.toISOString(), r.checkedInAt?.toISOString()]
        .map(csvCell)
        .join(","),
    );
    const filename = `attendees-event-${event.id}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send([header.map(csvCell).join(","), ...lines].join("\r\n"));
  }),
);

eventsRouter.post(
  "/:id/check-in",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const me = currentUser(req);
    const { event } = await loadManagedEvent(db, parseId(req.params.id, "event id"), me);
    const { code } = checkInSchema.parse(req.body);
    res.json({ data: await checkInTicket(db, event, me, { code }) });
  }),
);

eventsRouter.post(
  "/:id/attendees/:registrationId/check-in",
  requireAuth,
  requireRole("organizer", "admin"),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const me = currentUser(req);
    const { event } = await loadManagedEvent(db, parseId(req.params.id, "event id"), me);
    const registrationId = parseId(req.params.registrationId, "registration id");
    res.json({ data: await checkInTicket(db, event, me, { registrationId }) });
  }),
);
