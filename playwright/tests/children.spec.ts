import { test, expect } from "@playwright/test";

const TEST_CHILD = `PW-${Date.now()}`;

test("children page loads with the add form", async ({ page }) => {
  await page.goto("/children");
  // Page should show the add-child form
  await expect(page.locator("#first_name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add child" })).toBeVisible();
});

test("can add a new child and see them in the list", async ({ page }) => {
  await page.goto("/children");

  await page.locator("#first_name").fill(TEST_CHILD);
  await page.getByRole("button", { name: "Add child" }).click();

  // Server action reloads the page; new child should appear
  await expect(page.getByText(TEST_CHILD)).toBeVisible({ timeout: 10_000 });
});

test("child detail page loads for an existing child", async ({ page }) => {
  await page.goto("/children");

  // Click the first child link in the list (if any)
  const firstChildLink = page.locator("a").filter({ hasText: /[A-Z]/ }).first();
  const count = await firstChildLink.count();

  if (count === 0) {
    test.skip();
    return;
  }

  await firstChildLink.click();
  // Should navigate to /children/[id]
  await expect(page).toHaveURL(/\/children\/[a-f0-9-]{36}/, { timeout: 8_000 });
  await expect(page.getByRole("heading").first()).toBeVisible();
});
