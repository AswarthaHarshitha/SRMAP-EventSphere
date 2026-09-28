import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app";
import { configProblems } from "./config";

const problems = configProblems();
if (problems.length) console.error(`[startup] configuration problems: ${problems.join("; ")}`);

const app = createApp();

/** Serverless entry point: the platform serves static files and forwards /api/* here. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
