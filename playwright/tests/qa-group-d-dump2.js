const { chromium } = require("playwright");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const STATE = "d:\\Projects\\sparkplay\\playwright\\.auth\\qa-group-d.json";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STATE });
  const page = await context.newPage();

  const today = new Date().toISOString().slice(0, 10);
  for (const path of [`/safety-checks?date=${today}`, "/staff/roster", "/rooms", "/children"]) {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);
    const main = await page.locator("main, body").last().innerText().catch(() => "");
    console.log("\n\n===== " + path + " =====\n" + main.slice(0, 2500));
  }

  // Add missing Cleo child (confirmed genuine gap)
  await page.goto(`${BASE_URL}/children`);
  let bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("QaChild Cleo")) {
    await page.locator('input[name="first_name"]').fill("QaChild Cleo");
    await page.locator('input[name="date_of_birth"]').fill("2019-07-01");
    await page.locator('input[name="current_interests"]').fill("trucks, building blocks");
    await page.getByRole("button", { name: "Add child" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);
    bodyText = await page.locator("body").innerText();
    console.log("\n\nCleo retry result:", bodyText.includes("QaChild Cleo"));
  } else {
    console.log("\n\nCleo already present, no retry needed");
  }

  await browser.close();
})();
