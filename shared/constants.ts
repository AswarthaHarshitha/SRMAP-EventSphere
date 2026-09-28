export const USER_ROLES = ["student", "organizer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REGISTRATION_STATUSES = ["pending_payment", "confirmed", "cancelled", "expired"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["created", "paid", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EVENT_CATEGORIES = [
  "Technical",
  "Workshop",
  "Hackathon",
  "Seminar",
  "Guest Lecture",
  "Cultural",
  "Sports",
  "Club Activity",
  "Career",
  "Other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** How long a seat is held while a student completes an online payment. */
export const PAYMENT_HOLD_MINUTES = 15;

/** Largest event image accepted by the upload endpoint. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Prefix embedded in ticket QR codes so scanners can reject unrelated codes. */
export const TICKET_QR_PREFIX = "EVS1:";
