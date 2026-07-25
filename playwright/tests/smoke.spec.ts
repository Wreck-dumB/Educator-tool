import { test, expect } from "@playwright/test";

// Broad sweep: every main route should return something < 500.
// 404 is acceptable (placeholder route); 500 means a server exception — fail.
const ROUTES = [
  "/generate",
  "/activities",
  "/observations",
  "/observations/saved",
  "/children",
  "/attendance",
  "/food",
  "/nappy",
  "/sleep",
  "/medication-log",
  "/recipes",
  "/qip",
  "/policies",
  "/incident-reports",
  "/behaviour-support",
  "/risk-assessments",
  "/excursions",
  "/permission-slips",
  "/broadcasts",
  "/messages",
  "/wall",
  "/staff",
  "/rooms",
  "/white-noise",
  "/materials",
  "/waiting-list",
  "/onsite",
  "/physical-activity",
  "/safety-checks",
  "/dashboard",
];

for (const route of ROUTES) {
  test(`${route} loads without a 500`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status() ?? 200, `HTTP status for ${route}`).toBeLessThan(500);
    await expect(page.getByText("Application error")).not.toBeVisible();
    await expect(page.getByText("Internal Server Error")).not.toBeVisible();
  });
}
