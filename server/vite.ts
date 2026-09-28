import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { STATIC_SECURITY_HEADERS } from "./security";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Development: serve the React app through Vite's middleware with hot reload. */
export async function setupVite(app: Express, server: Server) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(here, "..", "vite.config.ts"),
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(path.resolve(here, "..", "client", "index.html"), "utf-8");
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

/** Production (self-hosted): serve the built client with SPA fallback. */
export function serveStatic(app: Express) {
  const distPath = path.resolve(here, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build directory not found: ${distPath}. Run "npm run build" first.`);
  }

  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y" }),
  );
  app.use(express.static(distPath, { index: false }));
  app.use("*", (_req, res) => {
    res.set({ ...STATIC_SECURITY_HEADERS, "Cache-Control": "no-cache" });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
