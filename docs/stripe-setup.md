# Stripe setup (test mode)

**Status as of 2026-08-19: done and verified.** `.env.local` already has `STRIPE_SECRET_KEY` and
the four `STRIPE_PRICE_*` IDs. A real end-to-end checkout has been run against this exact setup
(`playwright/tests/billing-checkout.spec.ts`) — subscribe → webhook → credit grant → credit spend
on a real generation call, all confirmed working. Nothing here requires a live/verified Stripe
account or real card processing; it's entirely test mode.

**Note on which Stripe account this uses:** rather than creating a brand-new Stripe account, this
reused the existing test-mode account from the ADHDan merch store project (`d:\Projects\adhdan-store\.env.local`)
— same Stripe login, DR. SparkPlay's own separate Products/Prices created inside it (prefixed
"DR. SparkPlay — "). That's fine for testing, but **before going live, get DR. SparkPlay its own
Stripe account** — a live/verified account is tied to one business's bank details and identity,
and you don't want SparkPlay subscription payouts landing in an account set up for ADHDan.

## If you need to redo any of this (new machine, rotated keys, etc.)

### 1. Get a Stripe test secret key

Either reuse `adhdan-store/.env.local`'s `STRIPE_SECRET_KEY` (same account, fine for testing), or
register fresh at https://dashboard.stripe.com/register — free, no business verification needed
for test mode, and Developers → API keys has the secret key (`sk_test_...`).

### 2. Create the plan prices

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
```

Creates the 3 subscription plans + credit top-up product and prints price IDs — paste into
`.env.local` as `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_STANDARD` / `STRIPE_PRICE_PREMIUM` /
`STRIPE_PRICE_TOPUP`. Safe to re-run — it finds and reuses existing prices by name instead of
duplicating them.

### 3. Webhook (local dev)

The Stripe CLI is installed at `C:\Users\Drust\bin\stripe.exe`. **Important: this repo's dev
server runs on port 3001, not the Next.js default 3000** — something else on this machine holds
3000, and `.env.test.local`'s `PLAYWRIGHT_BASE_URL` is already pinned to 3001 to match. Start both:

```bash
npx next dev -p 3001
STRIPE_SECRET_KEY=sk_test_... /c/Users/Drust/bin/stripe.exe listen --forward-to localhost:3001/api/billing/webhook
```

The `listen` command prints a `whsec_...` value each time it starts — put it in both
`.env.local` and `.env.test.local` as `STRIPE_WEBHOOK_SECRET` (the Next server and the Playwright
test process load different env files, so it needs to be in both). Leave `stripe listen` running
while testing checkout; without it, Stripe has no way to tell the app a payment succeeded.

### 4. Webhook (production, once ready to go live)

Dashboard → Developers → Webhooks → Add endpoint → `https://<your-domain>/api/billing/webhook`,
events `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`,
`customer.subscription.deleted`. Copy its signing secret into Vercel's `STRIPE_WEBHOOK_SECRET`.

### 5. Re-run the verification test

```bash
npx playwright test playwright/tests/billing-checkout.spec.ts --project=chromium
```

Test card is Stripe's standard `4242 4242 4242 4242`, any future expiry/CVC. The test is
idempotent — safe to run again even if the test director account is already subscribed from a
previous run, in which case it verifies credit consumption on the existing subscription instead
of repeating checkout.

## A real bug this surfaced

Every webhook POST was silently 307-redirected to `/login` before reaching the route handler —
`src/proxy.ts`'s auth middleware didn't exclude `/api/billing/webhook`, and Stripe's
server-to-server callback has no Supabase session cookie by definition. Fixed by adding it to the
middleware matcher's exclusion list, same pattern already used for Sentry's `/monitoring` tunnel
route. Without this end-to-end test actually driving a real checkout, this would have shipped
broken — no subscription would ever have actually granted credits in production.

## Going live later (Phase B in the business plan, not now)

Test mode is a fully separate environment from live mode — nothing above needs redoing except
swapping `sk_test_...`/webhook secret for live equivalents once Stripe's identity/bank-detail
verification (a step only you can complete — see the business-plan artifact's Phase B) is done,
**on DR. SparkPlay's own Stripe account**, not the reused ADHDan one.
