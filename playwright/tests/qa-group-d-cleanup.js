const { chromium } = require("playwright");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const STATE = "d:\\Projects\\sparkplay\\playwright\\.auth\\qa-group-d.json";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: STATE });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/wall`);
  await page.waitForLoadState("networkidle").catch(() => {});
  // Delete the two redundant "(retry)" posts created due to a verification-script false negative
  for (const text of ["QA wall post two (retry)", "QA wall post three (retry)"]) {
    const card = page.locator("div", { hasText: text }).last();
    const deleteBtn = card.getByRole("button", { name: "Delete" });
    if (await deleteBtn.count()) {
      await deleteBtn.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      console.log("Deleted:", text);
    } else {
      console.log("Not found to delete:", text);
    }
  }
  const bodyText = await page.locator("body").innerText();
  console.log("\nFinal wall state:\n", bodyText.slice(0, 800));
  await browser.close();
})();
