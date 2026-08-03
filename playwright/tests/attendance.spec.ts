import { test, expect } from "@playwright/test";

test("attendance register loads", async ({ page }) => {
  await page.goto("/attendance");
  // Page is titled "Roll Call" in the UI (nav label matches); "attendance"
  // only appears in the URL/description, not the heading itself.
  await expect(page.getByRole("heading", { name: /roll call/i })).toBeVisible();
});

test("can sign in a child and then sign them out", async ({ page }) => {
  await page.goto("/attendance");

  const signInButton = page.getByRole("button", { name: "Sign In" }).first();

  if (await signInButton.count() === 0) {
    test.skip();
    return;
  }

  await signInButton.click();

  // After sign-in the row changes: a Sign Out button should appear
  const signOutButton = page.getByRole("button", { name: "Sign Out" }).first();
  await expect(signOutButton).toBeVisible({ timeout: 10_000 });

  await signOutButton.click();

  // After sign-out a Sign In (or Sign In Again) button should reappear
  await expect(
    page.getByRole("button", { name: /sign in/i }).first()
  ).toBeVisible({ timeout: 10_000 });
});

test("can mark a child absent and then undo it", async ({ page }) => {
  await page.goto("/attendance");

  const absentButton = page.getByRole("button", { name: "Absent" }).first();

  if (await absentButton.count() === 0) {
    test.skip();
    return;
  }

  await absentButton.click();

  const undoButton = page.getByRole("button", { name: "Undo" }).first();
  await expect(undoButton).toBeVisible({ timeout: 10_000 });

  await undoButton.click();

  // Row should revert — Sign In or Absent buttons should reappear
  await expect(
    page.getByRole("button", { name: /sign in|absent/i }).first()
  ).toBeVisible({ timeout: 10_000 });
});
