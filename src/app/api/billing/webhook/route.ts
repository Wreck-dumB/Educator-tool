import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isPlan, PLAN_CREDIT_ALLOWANCE, planForPriceId, TOPUP_CREDIT_AMOUNT } from "@/lib/stripe";
import {
  addTopupCredits,
  findServiceIdByStripeCustomer,
  recordSubscriptionLink,
  renewCredits,
  setSubscriptionStatus,
} from "@/lib/supabase/billing";

// Stripe webhook — no user session, verified purely by signature. Must read
// the raw body (not request.json()) or signature verification fails.
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const serviceId = session.metadata?.service_id;
        if (!serviceId) break;

        if (session.metadata?.type === "topup") {
          await addTopupCredits(serviceId, TOPUP_CREDIT_AMOUNT);
          break;
        }

        const plan = session.metadata?.plan;
        if (!isPlan(plan) || typeof session.subscription !== "string" || typeof session.customer !== "string") break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await recordSubscriptionLink({
          serviceId,
          plan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.customer !== "string") break;

        const serviceId = await findServiceIdByStripeCustomer(invoice.customer);
        if (!serviceId) break;

        const priceRef = invoice.lines.data[0]?.pricing?.price_details?.price;
        const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id;
        const plan = priceId ? planForPriceId(priceId) : null;
        if (!plan) break;

        await renewCredits({ serviceId, plan, amount: PLAN_CREDIT_ALLOWANCE[plan] });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer !== "string") break;

        const serviceId = await findServiceIdByStripeCustomer(subscription.customer);
        if (!serviceId) break;

        await setSubscriptionStatus(serviceId, event.type === "customer.subscription.deleted" ? "canceled" : subscription.status);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handling failed for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
