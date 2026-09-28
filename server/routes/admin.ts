import { Router } from "express";
import { and, count, desc, eq, gt, ilike, isNotNull, isNull, or, sql, sum, type SQL } from "drizzle-orm";
import { z } from "zod";
import { events, payments, registrations, users } from "../../shared/schema";
import { EVENT_STATUSES, REGISTRATION_STATUSES, USER_ROLES } from "../../shared/constants";
import type { AdminRegistrationRow, AdminStats } from "../../shared/api";
import { adminUserUpdateSchema, paginationSchema } from "../../shared/validation";
import { currentUser, requireAuth, requireRole, toPublicUser } from "../auth";
import { getDb } from "../db";
import { escapeLike, paged } from "../pagination";
import { asyncHandler, badRequest, notFound, parseId } from "../errors";
import { organizerColumns, toEventSummary } from "../services/events";
import { cancelRegistration } from "../services/registrations";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));


adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const now = new Date();

    const [userRows, eventRows, [upcoming], regRows, [checkedIn], [revenue], byDay, byCategory, recent] = await Promise.all([
      db.select({ role: users.role, active: users.isActive, n: count() }).from(users).groupBy(users.role, users.isActive),
      db.select({ status: events.status, n: count() }).from(events).groupBy(events.status),
      db.select({ n: count() }).from(events).where(and(eq(events.status, "published"), gt(events.startAt, now))),
      db.select({ status: registrations.status, n: count() }).from(registrations).groupBy(registrations.status),
      db.select({ n: count() }).from(registrations).where(isNotNull(registrations.checkedInAt)),
      db
        .select({ total: sum(payments.amountInPaise) })
        .from(payments)
        .where(and(eq(payments.status, "paid"), isNull(payments.failureReason))),
      db.execute(sql`
        select to_char(d.day, 'YYYY-MM-DD') as date, count(r.id)::int as count
        from generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') as d(day)
        left join registrations r
          on (r.created_at at time zone 'Asia/Kolkata')::date = d.day::date and r.status in ('confirmed', 'pending_payment')
        group by d.day order by d.day`),
      db.select({ category: events.category, count: count() }).from(events).groupBy(events.category).orderBy(desc(count())),
      db
        .select({
          id: registrations.id,
          createdAt: registrations.createdAt,
          status: registrations.status,
          user: { id: users.id, name: users.name },
          event: { id: events.id, title: events.title },
        })
        .from(registrations)
        .innerJoin(users, eq(users.id, registrations.userId))
        .innerJoin(events, eq(events.id, registrations.eventId))
        .orderBy(desc(registrations.createdAt))
        .limit(8),
    ]);

    const countUsers = (pred: (r: (typeof userRows)[number]) => boolean) =>
      userRows.filter(pred).reduce((s, r) => s + r.n, 0);
    const countEvents = (status?: string) =>
      eventRows.filter((r) => !status || r.status === status).reduce((s, r) => s + r.n, 0);
    const countRegs = (status?: string) =>
      regRows.filter((r) => !status || r.status === status).reduce((s, r) => s + r.n, 0);

    const data: AdminStats = {
      users: {
        total: countUsers(() => true),
        students: countUsers((r) => r.role === "student"),
        organizers: countUsers((r) => r.role === "organizer"),
        admins: countUsers((r) => r.role === "admin"),
        inactive: countUsers((r) => !r.active),
      },
      events: {
        total: countEvents(),
        published: countEvents("published"),
        drafts: countEvents("draft"),
        cancelled: countEvents("cancelled"),
        upcoming: upcoming.n,
      },
      registrations: {
        total: countRegs("confirmed") + countRegs("pending_payment") + countRegs("cancelled"),
        confirmed: countRegs("confirmed"),
        checkedIn: checkedIn.n,
        cancelled: countRegs("cancelled"),
      },
      revenueInPaise: Number(revenue.total ?? 0),
      registrationsByDay: (byDay as unknown as { rows: { date: string; count: number }[] }).rows.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      eventsByCategory: byCategory,
      recentRegistrations: recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
    res.json({ data });
  }),
);

// ---------- Users ----------

const userQuerySchema = paginationSchema.extend({ role: z.enum(USER_ROLES).optional() });

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = userQuerySchema.parse(req.query);
    const filters: SQL[] = [];
    if (q.role) filters.push(eq(users.role, q.role));
    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      filters.push(or(ilike(users.name, term), ilike(users.email, term))!);
    }
    const where = filters.length ? and(...filters) : undefined;
    const db = getDb();
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
      db.select({ total: count() }).from(users).where(where),
    ]);
    res.json(paged(rows.map(toPublicUser), total, q.page, q.pageSize));
  }),
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "user id");
    const input = adminUserUpdateSchema.parse(req.body);
    const me = currentUser(req);
    if (id === me.id) throw badRequest("You can't change your own role or status.");

    const db = getDb();
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw notFound("User not found.");

    const [updated] = await db
      .update(users)
      .set({
        ...(input.role !== undefined && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        // Any role or status change revokes the user's existing sessions.
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, id))
      .returning();
    res.json({ data: toPublicUser(updated) });
  }),
);

// ---------- Events ----------

const eventQuerySchema = paginationSchema.extend({ status: z.enum(EVENT_STATUSES).optional() });

adminRouter.get(
  "/events",
  asyncHandler(async (req, res) => {
    const q = eventQuerySchema.parse(req.query);
    const filters: SQL[] = [];
    if (q.status) filters.push(eq(events.status, q.status));
    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      filters.push(or(ilike(events.title, term), ilike(users.name, term))!);
    }
    const where = filters.length ? and(...filters) : undefined;
    const db = getDb();
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ event: events, organizer: organizerColumns })
        .from(events)
        .innerJoin(users, eq(users.id, events.organizerId))
        .where(where)
        .orderBy(desc(events.startAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db.select({ total: count() }).from(events).innerJoin(users, eq(users.id, events.organizerId)).where(where),
    ]);
    res.json(paged(rows.map((r) => toEventSummary(r.event, r.organizer)), total, q.page, q.pageSize));
  }),
);

// ---------- Registrations ----------

const registrationQuerySchema = paginationSchema.extend({ status: z.enum(REGISTRATION_STATUSES).optional() });

adminRouter.get(
  "/registrations",
  asyncHandler(async (req, res) => {
    const q = registrationQuerySchema.parse(req.query);
    const filters: SQL[] = [];
    if (q.status) filters.push(eq(registrations.status, q.status));
    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      filters.push(or(ilike(users.name, term), ilike(users.email, term), ilike(events.title, term))!);
    }
    const where = filters.length ? and(...filters) : undefined;
    const db = getDb();
    const base = () =>
      db
        .select({
          registration: registrations,
          user: { id: users.id, name: users.name, email: users.email },
          event: { id: events.id, title: events.title, startAt: events.startAt },
        })
        .from(registrations)
        .innerJoin(users, eq(users.id, registrations.userId))
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(where);
    const [rows, [{ total }]] = await Promise.all([
      base().orderBy(desc(registrations.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
      db
        .select({ total: count() })
        .from(registrations)
        .innerJoin(users, eq(users.id, registrations.userId))
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(where),
    ]);
    const data: AdminRegistrationRow[] = rows.map(({ registration: r, user, event }) => ({
      id: r.id,
      status: r.status,
      amountInPaise: r.amountInPaise,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      user,
      event: { ...event, startAt: event.startAt.toISOString() },
    }));
    res.json(paged(data, total, q.page, q.pageSize));
  }),
);

adminRouter.post(
  "/registrations/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "registration id");
    const db = getDb();
    const [row] = await db
      .select({ registration: registrations, event: events })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(registrations.id, id))
      .limit(1);
    if (!row) throw notFound("Registration not found.");
    await cancelRegistration(db, row.registration, row.event, currentUser(req));
    res.json({ data: { ok: true } });
  }),
);
