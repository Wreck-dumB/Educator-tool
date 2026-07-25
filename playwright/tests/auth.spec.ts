import { test, expect } from "@playwright/test";

// Bypass stored auth for all tests in this file
test.use({ storageState: { cookies: [], origins: [] } });

test("login with valid credentials redirects to /generate", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(process.env.TEST_DIRECTOR_EMAIL!);
  await page.locator("#password").fill(process.env.TEST_DIRECTOR_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/generate", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/generate/);
});

test("login with wrong password stays on /login with an error param", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(process.env.TEST_DIRECTOR_EMAIL!);
  await page.locator("#password").fill("definitely-wrong-password-xyz");
  await page.getByRole("button", { name: "Log in" }).click();

  // auth/actions.ts redirects to /login?error=... on failure
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  await expect(page).toHaveURL(/[?&]error=/);
});

test("unauthenticated access to /generate redirects to /login", async ({ page }) => {
  await page.goto("/generate");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated access to /children redirects to /login", async ({ page }) => {
  await page.goto("/children");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated access to /attendance redirects to /login", async ({ page }) => {
  await page.goto("/attendance");
  await expect(page).toHaveURL(/\/login/);
});
