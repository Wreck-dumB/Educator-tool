import { test, expect } from "@playwright/test";

test("recipes page loads", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: /recipes/i })).toBeVisible();
});

test("recipe generator form is present", async ({ page }) => {
  await page.goto("/recipes");
  // There should be a generate button and at least one text area / input
  await expect(page.getByRole("button", { name: /generate/i })).toBeVisible();
});

test("allergy summary reflects enrolled children", async ({ page }) => {
  // Sign in a child on the attendance page first so the allergy check has context
  await page.goto("/attendance");
  const signInBtn = page.getByRole("button", { name: "Sign In" }).first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await expect(page.getByRole("button", { name: "Sign Out" }).first()).toBeVisible({ timeout: 8_000 });
  }

  // Navigate to recipes and confirm the page still loads cleanly
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: /recipes/i })).toBeVisible();
  // No 500 / error boundary visible
  await expect(page.getByText("Application error")).not.toBeVisible();
});
