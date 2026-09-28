import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { users, type User } from "../shared/schema";
import type { UserRole } from "../shared/constants";
import type { PublicUser } from "../shared/api";
import { config } from "./config";
import { getDb } from "./db";
import { forbidden, HttpError, unauthorized } from "./errors";

export const SESSION_COOKIE = "evs_session";
const BCRYPT_ROUNDS = 12;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function secret(): string {
  const value = config().jwtSecret;
  if (!value) {
    console.error("[auth] JWT_SECRET is not configured");
    throw new HttpError(503, "SERVICE_UNAVAILABLE", "The service is not configured yet. Please try again later.");
  }
  return value;
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export function issueSession(res: Response, user: User) {
  const days = config().jwtExpiresInDays;
  const token = jwt.sign({ v: user.tokenVersion }, secret(), {
    subject: String(user.id),
    expiresIn: `${days}d`,
    algorithm: "HS256",
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config().isProduction, sameSite: "lax", path: "/" });
}

/** Resolves the signed-in user from the session cookie, or null when absent/invalid/revoked. */
async function resolveUser(req: Request): Promise<User | null> {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret(), { algorithms: ["HS256"] }) as jwt.JwtPayload;
  } catch {
    return null;
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id)) return null;

  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
  return user;
}

/** Attaches req.user when a valid session exists; never rejects the request. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    else if (req.cookies?.[SESSION_COOKIE]) clearSession(res);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      if (req.cookies?.[SESSION_COOKIE]) {
        clearSession(res);
        throw new HttpError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
      }
      throw unauthorized();
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/** The authenticated user; only valid after requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}
