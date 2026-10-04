import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByRole("button").or(page.getByText(/sign in|google|login/i)).first(),
    ).toBeVisible();
  });

  test("booking page loads", async ({ page }) => {
    const res = await page.goto("/booking");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("docs UI loads", async ({ page }) => {
    const res = await page.goto("/docs");
    expect(res?.ok()).toBeTruthy();
  });
});

test.describe("api v1 smoke", () => {
  test("health is ok", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("connected");
  });

  test("openapi is served", async ({ request }) => {
    const res = await request.get("/api/v1/openapi");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.openapi).toMatch(/^3\./);
    expect(body.paths["/api/v1/courts"]).toBeTruthy();
    expect(body.paths["/api/v1/bookings/availability"]).toBeTruthy();
  });

  test("courts catalog is public", async ({ request }) => {
    const res = await request.get("/api/v1/courts");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.courts)).toBe(true);
  });

  test("protected account route returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/account/profile");
    expect(res.status()).toBe(401);
  });

  test("protected admin route returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/admin/bookings");
    expect([401, 403]).toContain(res.status());
  });

  test("legacy /api/courts is gone", async ({ request }) => {
    const res = await request.get("/api/courts");
    expect(res.status()).toBe(404);
  });
});
