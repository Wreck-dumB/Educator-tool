import Stripe from "stripe";

// Stripe integration for subscription billing (docs/pricing-and-credits.md).
// Test-mode keys are enough to build and exercise this end-to-end — nothing
// here requires a live/verified Stripe account. See docs/stripe-setup.md for
// the one-time dashboard steps (free, ~5 min) needed before this works.

export type Plan = "starter" | "standard" | "premium";

export const PLAN_CREDIT_ALLOWANCE: Record<Plan, number> = {
  starter: 40,
  standard: 100,
  premium: 160,
};

export const PLAN_PRICE_AUD: Record<Plan, number> = {
  starter: 59,
  standard: 89,
  premium: 129,
};

// Stripe Price IDs are created per-account (dashboard or API) and don't exist
// until docs/stripe-setup.md's setup script has been run once against the
// user's own Stripe account — never hardcode a real price id here.
const PLAN_PRICE_ENV: Record<Plan, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  standard: process.env.STRIPE_PRICE_STANDARD,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

const TOPUP_PRICE_ENV = process.env.STRIPE_PRICE_TOPUP; // $15 / 25 credits
export const TOPUP_CREDIT_AMOUNT = 25;

export function isPlan(value: string | null | undefined): value is Plan {
  return value === "starter" || value === "standard" || value === "premium";
}

export function priceIdForPlan(plan: Plan): string | null {
  return PLAN_PRICE_ENV[plan] ?? null;
}

export function topupPriceId(): string | null {
  return TOPUP_PRICE_ENV ?? null;
}

export function planForPriceId(priceId: string): Plan | null {
  const entry = (Object.entries(PLAN_PRICE_ENV) as [Plan, string | undefined][]).find(([, id]) => id === priceId);
  return entry ? entry[0] : null;
}

let cached: Stripe | null = null;

/** Returns null (not a throw) when STRIPE_SECRET_KEY is unset, matching the
 * fail-soft convention used elsewhere (lib/email.ts) for optional providers
 * that aren't live yet — billing routes check this and return a clear
 * "billing isn't set up yet" response instead of a raw 500. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}
