import { test, expect } from "@playwright/test";

// Broad sweep: every main route should return something < 500.
// 404 is acceptable (placeholder route); 500 means a server exception — fail.
const ROUTES = [
  "/activities",
  "/attendance",
  "/audit",
  "/auslan",
  "/behaviour-support",
  "/brain-breaks",
  "/broadcasts",
  "/casual-days",
  "/ccs-estimator",
  "/children",
  "/closures",
  "/complaints",
  "/compliance",
  "/dashboard",
  "/day-plan",
  "/digest",
  "/excursions",
  "/follow-ups",
  "/food",
  "/forms",
  "/generate",
  "/handover",
  "/health-plans",
  "/import",
  "/incident-reports",
  "/invoices",
  "/materials",
  "/medication-log",
  "/messages",
  "/milestones",
  "/nappy",
  "/nqs",
  "/observations",
  "/observations/saved",
  "/occupancy",
  "/onsite",
  "/pd-hours",
  "/permission-slips",
  "/physical-activity",
  "/policies",
  "/posters",
  "/programming",
  "/programs",
  "/qip",
  "/recipes",
  "/reflections",
  "/risk-assessments",
  "/rooms",
  "/safe-work-procedures",
  "/safety-checks",
  "/search",
  "/settings",
  "/sleep",
  "/staff",
  "/transitions",
  "/visitor-log",
  "/waiting-list",
  "/wall",
  "/white-noise",
  "/worksheets",
];

for (const route of ROUTES) {
  test(`${route} loads without a 500`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status() ?? 200, `HTTP status for ${route}`).toBeLessThan(500);
    await expect(page.getByText("Application error")).not.toBeVisible();
    await expect(page.getByText("Internal Server Error")).not.toBeVisible();
  });
}
