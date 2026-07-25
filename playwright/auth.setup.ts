import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, ".auth/director.json");

setup("authenticate as director", async ({ page }) => {
  if (!process.env.TEST_DIRECTOR_EMAIL || !process.env.TEST_DIRECTOR_PASSWORD) {
    throw new Error(
      "Set TEST_DIRECTOR_EMAIL and TEST_DIRECTOR_PASSWORD in playwright/.env.test.local before running tests"
    );
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login");
  await page.locator("#email").fill(process.env.TEST_DIRECTOR_EMAIL);
  await page.locator("#password").fill(process.env.TEST_DIRECTOR_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  // Login redirects to /generate by default (see src/app/auth/actions.ts)
  await page.waitForURL("**/generate", { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
