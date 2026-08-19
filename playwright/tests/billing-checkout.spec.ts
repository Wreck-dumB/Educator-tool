import { test, expect } from "@playwright/test";

// End-to-end verification of the Stripe billing build (2026-08-19, migration
// 0065): real Stripe test-mode checkout, real webhook via `stripe listen`
// forwarding to this dev server, real credit grant, real credit consumption
// on a generation call. Requires STRIPE_SECRET_KEY/STRIPE_PRICE_*/
// STRIPE_WEBHOOK_SECRET in .env.local and `stripe listen --forward-to
// localhost:3001/api/billing/webhook` running — skips itself otherwise so it
// doesn't fail CI or a fresh checkout with no Stripe keys configured.

test.skip(!process.env.STRIPE_SECRET_KEY, "Stripe test keys not configured — see docs/stripe-setup.md");

test("subscribing to a plan grants credits, and generating spends one", async ({ page }) => {
  test.setTimeout(90000); // real Stripe redirects + async webhook delivery, not just local rendering

  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

  // Idempotent: a prior run of this same test leaves the test director
  // already subscribed, and /billing shows the balance view instead of the
  // plan picker — skip straight to exercising credit consumption on the
  // existing subscription rather than failing on a missing picker.
  const choosePlan = page.getByRole("button", { name: "Choose this plan" }).first();
  const alreadySubscribed = !(await choosePlan.isVisible({ timeout: 5000 }).catch(() => false));

  if (alreadySubscribed) {
    await expect(page.getByText(/starter/i)).toBeVisible();
  } else {
    await choosePlan.click();

    // Redirects to Stripe's hosted checkout page. The checkout session was
    // created with an existing Stripe customer (email attached server-side),
    // so Stripe shows the email as read-only text rather than an input —
    // nothing to fill there.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });

    // A prior run's "Save my information" leaves this email recognised by
    // Link, which prompts for a one-time code instead of showing the card
    // form directly. Stripe's own test-mode copy says to enter 000000 — do
    // that rather than the flakier "Pay without Link" text click. Matched by
    // role, not the heading text, since it contains a curly apostrophe (’)
    // that a straight-quote string literal silently fails to match.
    const otpFirstDigit = page.getByRole("textbox", { name: "Security code character 1" });
    const cardRadio = page.getByRole("radio", { name: "Card" });
    await Promise.race([
      otpFirstDigit.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
      cardRadio.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    ]);

    if (await otpFirstDigit.isVisible().catch(() => false)) {
      // Confirming the code logs into Link, which already has a saved card
      // from an earlier run and goes straight to a one-click "Subscribe" —
      // no separate card-entry form to fill in this branch.
      await otpFirstDigit.pressSequentially("000000");
      await page.getByRole("button", { name: "Subscribe" }).click();
    } else {
      // Fresh checkout, no Link account yet — fill the plain card form.
      // The "Pay with card" action button only renders on hover of the
      // accordion row, which Playwright's actionability checks don't trigger
      // — force-click the underlying radio input instead of chasing hover.
      await cardRadio.click({ force: true });
      await page.getByPlaceholder("1234 1234 1234 1234").waitFor({ state: "visible", timeout: 15000 });
      await page.getByPlaceholder("1234 1234 1234 1234").fill("4242424242424242");
      await page.getByPlaceholder("MM / YY").fill("12/34");
      await page.getByPlaceholder("CVC").fill("123");
      await page.getByPlaceholder("Full name on card").fill("QA Test Director");
      const phoneField = page.getByPlaceholder("0412 345 678");
      if (await phoneField.isVisible().catch(() => false)) {
        await phoneField.fill("0412345678");
      }
      await page.getByRole("button", { name: "Subscribe" }).click();
    }

    // Back on /billing after Stripe redirects, with a live subscription.
    await page.waitForURL(/\/billing/, { timeout: 30000 });
    await expect(page.getByText(/starter/i)).toBeVisible({ timeout: 15000 });

    // The webhook's invoice.paid handler grants credits asynchronously —
    // poll rather than asserting immediately after the redirect.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(/40 \/ 40 left/)).toBeVisible();
    }).toPass({ timeout: 20000 });
  }

  // Now confirm enforcement actually spends a credit on a real creation
  // call, whichever branch got us to a subscribed state. Read the balance
  // first rather than assuming 40/40 — a re-run inherits whatever balance
  // the previous run's own consumption left behind.
  const balanceText = await page.getByText(/\d+ \/ \d+ left/).innerText();
  const before = Number(balanceText.match(/(\d+) \//)?.[1]);
  expect(Number.isFinite(before)).toBe(true);

  // checkAndConsumeCredit() runs before the AI call, so the credit is spent
  // regardless of whether the (separately, already-tested) generation itself
  // succeeds — assert only that it wasn't blocked as out-of-credits (402).
  const genRes = await page.request.post("/api/recipe", {
    data: { userInput: "quick morning tea snack for toddlers" },
  });
  expect(genRes.status()).not.toBe(402);

  await page.goto("/billing");
  await expect(page.getByText(new RegExp(`${before - 1} / \\d+ left`))).toBeVisible({ timeout: 10000 });
});
