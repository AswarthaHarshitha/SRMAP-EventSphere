import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  EVENT_STATUSES,
  PAYMENT_STATUSES,
  REGISTRATION_STATUSES,
  USER_ROLES,
} from "./constants";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => (Buffer.isBuffer(value) ? value : Buffer.from(value)),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const userRole = pgEnum("user_role", USER_ROLES);
export const eventStatus = pgEnum("event_status", EVENT_STATUSES);
export const registrationStatus = pgEnum("registration_status", REGISTRATION_STATUSES);
export const paymentStatus = pgEnum("payment_status", PAYMENT_STATUSES);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").default("student").notNull(),
  department: text("department"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  // Incremented on password change or deactivation to revoke existing sessions.
  tokenVersion: integer("token_version").default(0).notNull(),
  ...timestamps,
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    organizerId: integer("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    venue: text("venue").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    registrationDeadline: timestamp("registration_deadline", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull(),
    registeredCount: integer("registered_count").default(0).notNull(),
    priceInPaise: integer("price_in_paise").default(0).notNull(),
    status: eventStatus("status").default("draft").notNull(),
    imageUpdatedAt: timestamp("image_updated_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("events_status_start_idx").on(t.status, t.startAt),
    index("events_organizer_idx").on(t.organizerId),
  ],
);

export const eventImages = pgTable("event_images", {
  eventId: integer("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const registrations = pgTable(
  "registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: registrationStatus("status").notNull(),
    ticketCode: text("ticket_code").notNull().unique(),
    amountInPaise: integer("amount_in_paise").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: integer("checked_in_by").references(() => users.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // A student can hold at most one active registration per event.
    uniqueIndex("registrations_active_unique")
      .on(t.eventId, t.userId)
      .where(sql`${t.status} in ('pending_payment', 'confirmed')`),
    index("registrations_user_idx").on(t.userId),
    index("registrations_event_idx").on(t.eventId, t.status),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    amountInPaise: integer("amount_in_paise").notNull(),
    currency: text("currency").default("INR").notNull(),
    status: paymentStatus("status").default("created").notNull(),
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (t) => [index("payments_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Payment = typeof payments.$inferSelect;
