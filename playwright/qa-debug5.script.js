const { chromium } = require("@playwright/test");
const path = require("path");

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: path.join(__dirname, ".auth", "qa-group-a.json"), baseURL: "http://localhost:3000" });
  const page = await context.newPage();
  page.on("response", (res) => { if (res.url().includes("/api/generate")) console.log("RESPONSE:", res.status(), res.url(), Date.now()); });
  await page.goto("/generate");
  await page.locator("#focus_interest").fill("ocean animals");
  await page.locator("#age_bracket").fill("Kindergarten / school age (5+ years)");
  await page.locator("#additional_needs_field").fill("sensory sensitivity to loud noise, prefers quiet activities");
  await page.locator("#time").fill("15");
  await page.locator("#group").selectOption("whole_group");
  console.log("Clicking at", Date.now());
  await page.getByRole("button", { name: /^Generate$/ }).click();
  await page.waitForSelector("text=Save to library", { timeout: 90000 }).catch(e => console.log("TIMEOUT WAITING:", e.message));
  console.log("Done waiting at", Date.now());
  const saveCount = await page.getByRole("button", { name: "Save to library" }).count();
  console.log("Save buttons:", saveCount);
  await browser.close();
}
main();
