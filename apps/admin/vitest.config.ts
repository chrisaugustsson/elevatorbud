import { defineConfig } from "vitest/config";

/**
 * Standalone vitest config so tests don't load vite.config.ts (which wires
 * the Cloudflare vite plugin and is incompatible with vitest's node runner).
 * Only server-side TS tests live here for now — server-fn pure helpers.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
