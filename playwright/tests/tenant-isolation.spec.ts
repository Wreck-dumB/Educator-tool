import { test, expect } from "@playwright/test";

// Cross-tenant data isolation check. This app is multi-tenant (RLS scoped by
// owner_user_id) and the single scariest failure mode isn't a crash, it's one
// centre quietly seeing another centre's data. This spec logs in as a second,
// wholly separate centre and tries to reach the first centre's records by
// guessing/reusing a real record ID directly in the URL -- proving isolation
// holds even when the UI would never link there, not just that nav hides it.
//
// Requires TEST_TENANT_B_EMAIL / TEST_TENANT_B_PASSWORD and
// TEST_TENANT_A_CHILD_ID in playwright/.env.test.local.

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  test.skip(
    !process.env.TEST_TENANT_B_EMAIL || !process.env.TEST_TENANT_A_CHILD_ID,
    "Set TEST_TENANT_B_EMAIL/PASSWORD and TEST_TENANT_A_CHILD_ID to run the tenant isolation check",
  );
});

test("Centre B cannot view Centre A's child record by direct URL", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(process.env.TEST_TENANT_B_EMAIL!);
  await page.locator("#password").fill(process.env.TEST_TENANT_B_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/generate", { timeout: 15_000 });

  const foreignChildId = process.env.TEST_TENANT_A_CHILD_ID!;
  const response = await page.goto(`/children/${foreignChildId}`);

  // Whatever the app does here (404, redirect, empty state), it must not
  // render another centre's real child data.
  expect(response?.status() ?? 200, "HTTP status for foreign child record").toBeLessThan(500);
  await expect(page.getByText(/PW-\d+/)).not.toBeVisible();
});

test("Centre B cannot view Centre A's observations by direct query param", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(process.env.TEST_TENANT_B_EMAIL!);
  await page.locator("#password").fill(process.env.TEST_TENANT_B_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/generate", { timeout: 15_000 });

  const foreignChildId = process.env.TEST_TENANT_A_CHILD_ID!;
  const response = await page.goto(`/observations?child=${foreignChildId}`);

  expect(response?.status() ?? 200, "HTTP status for foreign observations query").toBeLessThan(500);
  await expect(page.getByText(/PW-\d+/)).not.toBeVisible();
});
