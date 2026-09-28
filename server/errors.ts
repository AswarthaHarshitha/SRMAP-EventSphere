import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "BAD_REQUEST", message, fields);
export const unauthorized = (message = "Please sign in to continue.") =>
  new HttpError(401, "UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have permission to do that.") =>
  new HttpError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);

/** Wraps an async route so rejected promises reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

function zodFields(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Postgres error codes that map to client errors. */
function fromPostgres(err: { code?: string }): HttpError | null {
  if (err.code === "23505") return conflict("That record already exists.");
  if (err.code === "23503") return conflict("That record is still referenced by other data.");
  if (err.code === "22P02") return badRequest("Invalid identifier.");
  return null;
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let httpError: HttpError | null = null;

  if (err instanceof HttpError) httpError = err;
  else if (err instanceof ZodError) {
    const fields = zodFields(err);
    httpError = badRequest(Object.values(fields)[0] ?? "Invalid request.", fields);
  } else if (typeof err === "object" && err !== null) {
    const e = err as { type?: string; status?: number; code?: string; cause?: { code?: string } };
    if (e.type === "entity.parse.failed") httpError = badRequest("Malformed JSON body.");
    else if (e.type === "entity.too.large") httpError = new HttpError(413, "PAYLOAD_TOO_LARGE", "The upload is too large.");
    else httpError = fromPostgres(e) ?? fromPostgres(e.cause ?? {});
  }

  if (!httpError) {
    console.error("[error]", err);
    httpError = new HttpError(500, "INTERNAL", "Something went wrong on our side. Please try again.");
  }

  if (res.headersSent) return;
  res.status(httpError.status).json({
    error: { code: httpError.code, message: httpError.message, fields: httpError.fields },
  });
}

export function parseId(value: string, label = "id"): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) throw badRequest(`Invalid ${label}.`);
  return id;
}
