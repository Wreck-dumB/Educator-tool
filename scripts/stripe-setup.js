// One-time helper: creates the DR. SparkPlay products/prices in your Stripe
// account (test mode by default — whatever key you pass) and prints the
// price IDs to paste into .env.local. Safe to re-run; it skips anything
// already created with a matching name.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js

const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first, e.g.:\n  STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js");
  process.exit(1);
}

const stripe = new Stripe(key);

const SUBSCRIPTION_PLANS = [
  { key: "STRIPE_PRICE_STARTER", name: "DR. SparkPlay — Starter", amount: 5900 },
  { key: "STRIPE_PRICE_STANDARD", name: "DR. SparkPlay — Standard", amount: 8900 },
  { key: "STRIPE_PRICE_PREMIUM", name: "DR. SparkPlay — Premium", amount: 12900 },
];

const TOPUP = { key: "STRIPE_PRICE_TOPUP", name: "DR. SparkPlay — 25 Credit Top-up", amount: 1500 };

async function findExistingPrice(productName) {
  const products = await stripe.products.search({ query: `name:"${productName}" AND active:"true"` });
  if (products.data.length === 0) return null;
  const prices = await stripe.prices.list({ product: products.data[0].id, active: true, limit: 1 });
  return prices.data[0] ?? null;
}

async function main() {
  const env = {};

  for (const plan of SUBSCRIPTION_PLANS) {
    let price = await findExistingPrice(plan.name);
    if (!price) {
      const product = await stripe.products.create({ name: plan.name });
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: "aud",
        recurring: { interval: "month" },
      });
      console.log(`Created ${plan.name} — ${price.id}`);
    } else {
      console.log(`Found existing ${plan.name} — ${price.id}`);
    }
    env[plan.key] = price.id;
  }

  let topupPrice = await findExistingPrice(TOPUP.name);
  if (!topupPrice) {
    const product = await stripe.products.create({ name: TOPUP.name });
    topupPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: TOPUP.amount,
      currency: "aud",
    });
    console.log(`Created ${TOPUP.name} — ${topupPrice.id}`);
  } else {
    console.log(`Found existing ${TOPUP.name} — ${topupPrice.id}`);
  }
  env[TOPUP.key] = topupPrice.id;

  console.log("\nAdd these to .env.local (and Vercel prod env once you're ready to go live):\n");
  for (const [k, v] of Object.entries(env)) {
    console.log(`${k}=${v}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
