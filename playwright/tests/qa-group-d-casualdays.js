const { chromium } = require("playwright");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const STATE = "d:\\Projects\\sparkplay\\playwright\\.auth\\qa-group-d.json";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STATE });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/casual-days`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const pendingText = await page.locator("main").innerText().catch(() => page.locator("body").innerText());
  console.log("PENDING TAB:\n", pendingText.slice(0, 800));

  await page.goto(`${BASE_URL}/casual-days?tab=history`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const historyText = await page.locator("main").innerText().catch(() => page.locator("body").innerText());
  console.log("\nHISTORY TAB:\n", historyText.slice(0, 800));

  await browser.close();
})();
