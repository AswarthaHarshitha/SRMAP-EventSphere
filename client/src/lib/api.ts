import { QueryClient } from "@tanstack/react-query";
import type { ApiError as ApiErrorBody } from "@shared/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Calls the API and returns the parsed JSON body. Throws ApiError with a user-safe message. */
export async function request<T>(method: Method, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const isRaw = body instanceof Blob;
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": isRaw ? body.type : "application/json" },
      body: body === undefined ? undefined : isRaw ? body : JSON.stringify(body),
      ...init,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON responses (e.g. a proxy error page) fall through to the generic message below.
  }

  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    const fallback =
      res.status >= 500 ? "The server ran into a problem. Please try again in a moment." : "The request could not be completed.";
    const apiError = new ApiError(res.status, err?.code ?? "HTTP_" + res.status, err?.message ?? fallback, err?.fields);
    if (res.status === 401 && err?.code === "SESSION_EXPIRED") onSessionExpired?.(apiError);
    throw apiError;
  }
  return json as T;
}

/** Shorthand for endpoints that wrap their payload as { data }. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await request<{ data: T }>(method, path, body);
  return res?.data;
}

let onSessionExpired: ((e: ApiError) => void) | null = null;
export function setSessionExpiredHandler(fn: (e: ApiError) => void) {
  onSessionExpired = fn;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => request("GET", queryKey[0] as string),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => error instanceof ApiError && (error.status === 0 || error.status >= 500) && count < 2,
    },
    mutations: { retry: false },
  },
});

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
