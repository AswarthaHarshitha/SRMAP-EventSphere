import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUSES, USER_ROLES } from "./constants";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number")
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const registerSchema = z.object({
  name: trimmed(2, 100, "Name"),
  email: emailSchema,
  password: passwordSchema,
  department: optionalText(100, "Department"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const profileSchema = z.object({
  name: trimmed(2, 100, "Name"),
  department: optionalText(100, "Department"),
  phone: phoneSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: passwordSchema,
});

const dateTime = (label: string) =>
  z.coerce.date({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be a valid date and time`,
  });

const eventFields = z.object({
  title: trimmed(3, 150, "Title"),
  description: trimmed(20, 5000, "Description"),
  category: z.enum(EVENT_CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  venue: trimmed(3, 200, "Venue"),
  startAt: dateTime("Start time"),
  endAt: dateTime("End time"),
  registrationDeadline: dateTime("Registration deadline"),
  capacity: z.coerce
    .number({ invalid_type_error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity is too large"),
  priceInPaise: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .int("Price must be in whole paise")
    .min(0, "Price cannot be negative")
    .max(10_000_000, "Price is too large")
    .refine((v) => v === 0 || v >= 100, "Paid events must cost at least ₹1"),
});

function checkTimeline(
  data: { startAt?: Date; endAt?: Date; registrationDeadline?: Date },
  ctx: z.RefinementCtx,
) {
  if (data.startAt && data.endAt && data.endAt <= data.startAt) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after the start time" });
  }
  if (data.startAt && data.registrationDeadline && data.registrationDeadline > data.startAt) {
    ctx.addIssue({
      code: "custom",
      path: ["registrationDeadline"],
      message: "Registration must close before the event starts",
    });
  }
}

export const eventInputSchema = eventFields.superRefine(checkTimeline);
export const eventUpdateSchema = eventFields.partial().superRefine(checkTimeline);

export const eventStatusSchema = z.object({ status: z.enum(EVENT_STATUSES) });

export const eventListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  when: z.enum(["upcoming", "past", "all"]).default("upcoming"),
  price: z.enum(["free", "paid", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const paginationSchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const checkInSchema = z.object({
  code: z.string().trim().min(1, "Ticket code is required").max(100),
});

export const verifyPaymentSchema = z.object({
  registrationId: z.number().int().positive(),
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().min(1).max(256),
});

export const abandonPaymentSchema = z.object({
  registrationId: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, "Nothing to update");

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
