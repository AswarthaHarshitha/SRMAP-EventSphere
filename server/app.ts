import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import type { HealthStatus, PublicConfig } from "../shared/api";
import { config, configProblems, paymentsEnabled } from "./config";
import { getDb } from "./db";
import { errorMiddleware, HttpError } from "./errors";
import { CONTENT_SECURITY_POLICY } from "./security";
import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { meRouter, registrationsRouter } from "./routes/registrations";
import { paymentsRouter, webhookHandler } from "./routes/payments";
import { organizerRouter } from "./routes/organizer";
import { adminRouter } from "./routes/admin";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigins(req: Request) {
  const own = `${req.protocol}://${req.get("host")}`;
  const { appUrl, corsOrigins } = config();
  return new Set([own, ...(appUrl ? [appUrl] : []), ...corsOrigins]);
}

/** Only explicitly configured cross-origin frontends may call the API with credentials. */
function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (origin && config().corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "600");
      return res.status(204).end();
    }
  }
  next();
}

/**
 * CSRF defence in depth on top of SameSite=Lax cookies: browsers always send Origin on
 * cross-site state-changing requests, so reject any that come from an unknown site.
 */
function originCheck(req: Request, _res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (UNSAFE_METHODS.has(req.method) && origin && !allowedOrigins(req).has(origin)) {
    return next(new HttpError(403, "BAD_ORIGIN", "Request origin not allowed."));
  }
  next();
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // One proxy hop (the hosting platform's edge) sits in front of the app.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: parseCsp(CONTENT_SECURITY_POLICY) },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use("/api", cors);

  // The webhook must see the raw body to verify Razorpay's signature, so it precedes the JSON parser.
  app.post("/api/payments/webhook", ...webhookHandler);

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", originCheck);
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/health", async (_req, res) => {
    const body: HealthStatus = { status: "ok", database: "up", time: new Date().toISOString() };
    if (configProblems().length) {
      body.status = "degraded";
      body.database = config().databaseUrl ? "up" : "unconfigured";
    }
    if (config().databaseUrl) {
      try {
        await getDb().execute(sql`select 1`);
      } catch (err) {
        console.error("[health] database check failed:", (err as Error).message);
        body.status = "degraded";
        body.database = "down";
      }
    }
    res.status(body.status === "ok" ? 200 : 503).json(body);
  });

  app.get("/api/config", (_req, res) => {
    const data: PublicConfig = {
      paymentsEnabled: paymentsEnabled(),
      razorpayKeyId: paymentsEnabled() ? config().razorpay.keyId : null,
      allowedEmailDomains: config().allowedEmailDomains,
    };
    res.json({ data });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/me", meRouter);
  app.use("/api/registrations", registrationsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/organizer", organizerRouter);
  app.use("/api/admin", adminRouter);

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "API endpoint not found.")));
  app.use(errorMiddleware);

  return app;
}

function parseCsp(policy: string) {
  const directives: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) directives[name] = values;
  }
  return directives;
}
