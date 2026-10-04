import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Prefer an already-running server (`PLAYWRIGHT_BASE_URL` or `reuseExistingServer`).
  // In CI, start production server after `npm run build`.
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start",
        url: `${baseURL}/api/v1/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          MONGODB_URI:
            process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ibex-e2e",
          NEXTAUTH_SECRET:
            process.env.NEXTAUTH_SECRET ||
            "e2e-nextauth-secret-at-least-32-chars",
          NEXTAUTH_URL: baseURL,
          APP_URL: baseURL,
        },
      },
});
