import type { EventStatus, PaymentStatus, RegistrationStatus, UserRole } from "./constants";

/** Dates travel over JSON as ISO-8601 strings. */
type ISODate = string;

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: ISODate;
}

export interface EventSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  venue: string;
  startAt: ISODate;
  endAt: ISODate;
  registrationDeadline: ISODate;
  capacity: number;
  registeredCount: number;
  seatsLeft: number;
  priceInPaise: number;
  status: EventStatus;
  imageUrl: string | null;
  registrationOpen: boolean;
  /** Why registration is closed, when it is. */
  registrationState: "open" | "closed" | "full" | "started" | "not_published" | "cancelled";
  organizer: { id: number; name: string; department: string | null };
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface EventDetail extends EventSummary {
  /** The viewer's active registration for this event, when signed in as a student. */
  myRegistration: RegistrationSummary | null;
  /** True when the viewer may edit this event. */
  canManage: boolean;
}

export interface RegistrationSummary {
  id: number;
  eventId: number;
  status: RegistrationStatus;
  ticketCode: string;
  amountInPaise: number;
  expiresAt: ISODate | null;
  checkedInAt: ISODate | null;
  cancelledAt: ISODate | null;
  createdAt: ISODate;
}

export interface TicketView extends RegistrationSummary {
  event: EventSummary;
  attendee: { id: number; name: string; email: string };
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RegisterResult {
  registration: RegistrationSummary;
  payment: RazorpayOrder | null;
}

export interface Attendee {
  registrationId: number;
  status: RegistrationStatus;
  ticketCode: string;
  amountInPaise: number;
  checkedInAt: ISODate | null;
  registeredAt: ISODate;
  user: { id: number; name: string; email: string; department: string | null };
}

export interface CheckInResult {
  outcome: "checked_in" | "already_checked_in";
  attendee: Attendee;
  event: { id: number; title: string };
}

export interface PaymentRecord {
  id: number;
  registrationId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountInPaise: number;
  currency: string;
  status: PaymentStatus;
  failureReason: string | null;
  createdAt: ISODate;
  event: { id: number; title: string } | null;
}

export interface OrganizerEventRow extends EventSummary {
  checkedInCount: number;
}

export interface OrganizerStats {
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  totalCheckIns: number;
  revenueInPaise: number;
}

export interface AdminStats {
  users: { total: number; students: number; organizers: number; admins: number; inactive: number };
  events: { total: number; published: number; drafts: number; cancelled: number; upcoming: number };
  registrations: { total: number; confirmed: number; checkedIn: number; cancelled: number };
  revenueInPaise: number;
  registrationsByDay: { date: string; count: number }[];
  eventsByCategory: { category: string; count: number }[];
  recentRegistrations: {
    id: number;
    createdAt: ISODate;
    status: RegistrationStatus;
    user: { id: number; name: string };
    event: { id: number; title: string };
  }[];
}

export interface AdminRegistrationRow {
  id: number;
  status: RegistrationStatus;
  amountInPaise: number;
  checkedInAt: ISODate | null;
  createdAt: ISODate;
  user: { id: number; name: string; email: string };
  event: { id: number; title: string; startAt: ISODate };
}

export interface PublicConfig {
  paymentsEnabled: boolean;
  razorpayKeyId: string | null;
  allowedEmailDomains: string[];
}

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down" | "unconfigured";
  time: ISODate;
}
