import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/kanban_test";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside Next's server bundle; tests run server code directly.
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.int.test.ts"],
          setupFiles: ["./test/setup-dom.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          env: { DATABASE_URL: testDatabaseUrl },
          globalSetup: ["./test/global-setup-db.ts"],
          setupFiles: ["./test/setup-db.ts"],
          // Files share one database, so run them one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
