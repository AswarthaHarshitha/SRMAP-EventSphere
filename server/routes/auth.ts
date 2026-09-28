import { randomUUID } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { users } from "../../shared/schema";
import { changePasswordSchema, loginSchema, profileSchema, registerSchema } from "../../shared/validation";
import {
  clearSession,
  currentUser,
  hashPassword,
  optionalAuth,
  issueSession,
  requireAuth,
  toPublicUser,
  verifyPassword,
} from "../auth";
import { config } from "../config";
import { getDb } from "../db";
import { asyncHandler, badRequest, conflict, HttpError } from "../errors";

// Compared against when the email is unknown so response time doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomUUID()));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => config().isTest,
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes and try again." },
    }),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const domains = config().allowedEmailDomains;
    const domain = input.email.split("@")[1];
    if (domains.length && !domains.includes(domain)) {
      throw badRequest(`Please use your university email address (${domains.map((d) => "@" + d).join(", ")}).`, {
        email: "Email domain is not allowed",
      });
    }

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) throw conflict("An account with this email already exists.");

    // Public sign-up always creates a student account; roles are granted by an administrator.
    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        department: input.department,
        passwordHash: await hashPassword(input.password),
        role: "student",
      })
      .returning();

    issueSession(res, user);
    res.status(201).json({ data: toPublicUser(user) });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const [user] = await getDb().select().from(users).where(eq(users.email, input.email)).limit(1);

    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    if (!user.isActive) throw new HttpError(403, "ACCOUNT_DISABLED", "This account has been deactivated. Contact an administrator.");

    issueSession(res, user);
    res.json({ data: toPublicUser(user) });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ data: { ok: true } });
});

// Returns the signed-in user, or null for visitors (a normal state, so not a 401).
authRouter.get("/me", optionalAuth, (req, res) => {
  res.json({ data: req.user ? toPublicUser(req.user) : null });
});

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = profileSchema.parse(req.body);
    const [user] = await getDb()
      .update(users)
      .set({ name: input.name, department: input.department, phone: input.phone })
      .where(eq(users.id, currentUser(req).id))
      .returning();
    res.json({ data: toPublicUser(user) });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const me = currentUser(req);
    if (!(await verifyPassword(input.currentPassword, me.passwordHash))) {
      throw badRequest("Your current password is incorrect.", { currentPassword: "Incorrect password" });
    }
    // Bumping the token version signs out every other session.
    const [user] = await getDb()
      .update(users)
      .set({ passwordHash: await hashPassword(input.newPassword), tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, me.id))
      .returning();
    issueSession(res, user);
    res.json({ data: { ok: true } });
  }),
);
