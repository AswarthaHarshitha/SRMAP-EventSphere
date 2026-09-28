// Packages the Vite client and the Express API into Vercel's Build Output API layout
// (.vercel/output). Run after `vite build`; see `npm run build:vercel`.
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STATIC_SECURITY_HEADERS } from "../server/security";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");
const fnDir = path.join(out, "functions", "api.func");

await rm(out, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

await cp(path.join(root, "dist", "public"), path.join(out, "static"), { recursive: true });

await build({
  entryPoints: [path.join(root, "server", "vercel.ts")],
  outfile: path.join(fnDir, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  external: ["pg-native"],
  // Some bundled CommonJS dependencies call require() for Node built-ins.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});

await writeFile(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 30,
      // Mumbai region: closest to the university and to the database.
      regions: [process.env.VERCEL_FUNCTION_REGION || "bom1"],
    },
    null,
    2,
  ),
);

await writeFile(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/assets/(.*)$",
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        { src: "^/(?!api(?:/|$)).*$", headers: STATIC_SECURITY_HEADERS, continue: true },
        { handle: "filesystem" },
        { src: "^/api(?:/.*)?$", dest: "/api" },
        // Missing hashed assets must 404 rather than fall back to (and cache) index.html.
        { src: "^/assets/.*$", status: 404 },
        { src: "^/.*$", dest: "/index.html", headers: { "Cache-Control": "no-cache" } },
      ],
    },
    null,
    2,
  ),
);

console.log("Vercel build output written to .vercel/output");
