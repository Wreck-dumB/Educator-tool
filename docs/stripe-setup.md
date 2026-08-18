# Stripe setup (test mode, ~5 minutes, free)

The billing code (docs/pricing-and-credits.md's model, built 2026-08-19) is fully wired and
fails open everywhere until you do this — the app behaves exactly as it does today until these
env vars exist. Nothing here requires a live/verified Stripe account or real card processing.

## 1. Create a free Stripe account

https://dashboard.stripe.com/register — takes an email + password, no business verification
needed to use test mode. You'll land in test mode by default (toggle top-right confirms it).

## 2. Get your test secret key

Dashboard → Developers → API keys → copy the **Secret key** (starts `sk_test_...`).

## 3. Create the plan prices

Run the helper script from the repo root — it creates the 3 subscription plans + the credit
top-up product in your Stripe account and prints the price IDs:

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
```

Paste its output into `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_TOPUP=price_...
```

## 4. Webhook (local dev)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

It prints a `whsec_...` value — add it as `STRIPE_WEBHOOK_SECRET` in `.env.local`. Leave
`stripe listen` running while testing checkout locally; without it, Stripe has no way to tell
the app a payment succeeded.

## 5. Webhook (production, once ready)

Dashboard → Developers → Webhooks → Add endpoint → `https://<your-domain>/api/billing/webhook`,
select events `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`,
`customer.subscription.deleted`. Copy its signing secret into Vercel's `STRIPE_WEBHOOK_SECRET`.

## 6. Test it

With `stripe listen` running, go to `/billing`, choose a plan — Stripe Checkout opens, use test
card `4242 4242 4242 4242`, any future expiry/CVC. You should land back on `/billing` with the
plan active and credits granted within a few seconds (the webhook does the granting).

## Going live later (Phase B in the business plan, not now)

Test mode is a fully separate environment from live mode — nothing above needs redoing except
swapping `sk_test_...`/webhook secret for live equivalents once Stripe's identity/bank-detail
verification (a step only you can complete — see the business-plan artifact's Phase B) is done.
