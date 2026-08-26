const { chromium } = require("playwright");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const STATE = "d:\\Projects\\sparkplay\\playwright\\.auth\\qa-group-d.json";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STATE });
  const page = await context.newPage();
  for (const path of ["/visitor-log", "/medication-log", "/wall", "/compliance", "/invoices"]) {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const main = await page.locator("main, body").last().innerText().catch(() => "");
    console.log("\n\n===== " + path + " =====\n" + main.slice(0, 4000));
  }
  await browser.close();
})();
