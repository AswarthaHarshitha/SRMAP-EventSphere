import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Each file boots its own in-process Postgres (WASM); booting several at once stalls, so run files serially.
    pool: "forks",
    fileParallelism: false,
  },
});
