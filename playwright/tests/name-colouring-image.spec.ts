import { test, expect } from "@playwright/test";

// Verifies the name_colouring worksheet now renders a stencil image under the
// name when an image_subject is present (previously always a blank box).
test("name_colouring worksheet auto-generates and displays the stencil image", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.url().includes("pollinations")) {
      console.log(`POLLINATIONS RESPONSE: ${res.status()} ${res.statusText()} ${res.url().slice(0, 120)}`);
    }
  });
  page.on("requestfailed", (req) => {
    if (req.url().includes("pollinations")) {
      console.log(`POLLINATIONS REQUEST FAILED: ${req.failure()?.errorText} ${req.url().slice(0, 120)}`);
    }
  });

  await page.goto(
    "/worksheet?type=name_colouring&name=Mia&title=Colour+In+Your+Name&image_subject=a+friendly+dinosaur",
  );

  // Name renders immediately (pure SVG text, no network call)
  await expect(page.locator("svg text").filter({ hasText: "Mia" })).toBeVisible();

  // The request fires (correct prompt reaches Pollinations) and the image
  // actually loads. model=flux previously required Pollinations auth and
  // reliably 429'd/timed out for anonymous callers; the route now requests
  // model=sana, which resolves for anonymous callers.
  const img = page.locator("img[alt='Activity image']");
  await expect(img).toHaveCount(1, { timeout: 10_000 });
  const src = await img.getAttribute("src");
  expect(src).toContain("pollinations.ai");
  expect(src).toContain("dinosaur");
  await expect(img).toHaveJSProperty("complete", true, { timeout: 30_000 });
  await expect(img).not.toHaveCSS("display", "none");

  // The graceful-degradation failure message should not appear on a
  // successful generation.
  await expect(page.getByText("Image couldn't be generated")).toHaveCount(0);

  // The old always-blank dashed glue box should no longer be present when an
  // image_subject was supplied (it's been replaced by the image/error UI).
  await expect(page.getByLabel("Glue / decorating space")).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

// Regression check: a plain name_colouring sheet with NO image_subject must
// still fall back to the blank glue/decorate box exactly as before.
test("name_colouring worksheet with no image_subject stays blank (no image call)", async ({ page }) => {
  await page.goto("/worksheet?type=name_colouring&name=Jack&title=Colour+In+Your+Name");

  await expect(page.locator("svg text").filter({ hasText: "Jack" })).toBeVisible();
  await expect(page.getByLabel("Glue / decorating space")).toBeVisible();
  await expect(page.locator("img[alt='Activity image']")).toHaveCount(0);
});
