import { eq } from "drizzle-orm";
import { events, users, type Event, type Registration, type User } from "../../shared/schema";
import type { EventSummary, RegistrationSummary } from "../../shared/api";
import type { Database } from "../db";
import { forbidden, notFound } from "../errors";

export type OrganizerInfo = { id: number; name: string; department: string | null };

export const organizerColumns = {
  id: users.id,
  name: users.name,
  department: users.department,
};

export function registrationState(event: Event, now = new Date()): EventSummary["registrationState"] {
  if (event.status === "cancelled") return "cancelled";
  if (event.status !== "published") return "not_published";
  if (now >= event.startAt) return "started";
  if (now > event.registrationDeadline) return "closed";
  if (event.registeredCount >= event.capacity) return "full";
  return "open";
}

export function eventImageUrl(event: Pick<Event, "id" | "imageUpdatedAt">) {
  return event.imageUpdatedAt ? `/api/events/${event.id}/image?v=${event.imageUpdatedAt.getTime()}` : null;
}

export function toEventSummary(event: Event, organizer: OrganizerInfo): EventSummary {
  const state = registrationState(event);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    seatsLeft: Math.max(0, event.capacity - event.registeredCount),
    priceInPaise: event.priceInPaise,
    status: event.status,
    imageUrl: eventImageUrl(event),
    registrationOpen: state === "open",
    registrationState: state,
    organizer,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toRegistrationSummary(r: Registration): RegistrationSummary {
  return {
    id: r.id,
    eventId: r.eventId,
    status: r.status,
    ticketCode: r.ticketCode,
    amountInPaise: r.amountInPaise,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    checkedInAt: r.checkedInAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function findEventWithOrganizer(db: Database, id: number) {
  const [row] = await db
    .select({ event: events, organizer: organizerColumns })
    .from(events)
    .innerJoin(users, eq(users.id, events.organizerId))
    .where(eq(events.id, id))
    .limit(1);
  return row ?? null;
}

export const canManageEvent = (user: User | undefined, event: Event) =>
  !!user && (user.role === "admin" || (user.role === "organizer" && event.organizerId === user.id));

/** Loads an event the user is allowed to manage, or throws 404/403. */
export async function loadManagedEvent(db: Database, id: number, user: User) {
  const row = await findEventWithOrganizer(db, id);
  if (!row) throw notFound("Event not found.");
  if (!canManageEvent(user, row.event)) throw forbidden("You can only manage events you organize.");
  return row;
}
