import { createServer } from "node:http";
import { createApp } from "./app";
import { config, configProblems } from "./config";
import { serveStatic, setupVite } from "./vite";

const problems = configProblems();
if (problems.length) {
  console.error(`[startup] configuration problems:\n  - ${problems.join("\n  - ")}`);
  if (config().isProduction) process.exit(1);
}

const app = createApp();
const server = createServer(app);

if (config().isProduction) serveStatic(app);
else await setupVite(app, server);

server.listen(config().port, "0.0.0.0", () => {
  console.log(`[startup] SRMAP EventSphere listening on http://localhost:${config().port}`);
});
