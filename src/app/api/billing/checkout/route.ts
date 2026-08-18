import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyServiceId } from "@/lib/supabase/billing";
import { getStripe, isPlan, priceIdForPlan, topupPriceId } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind === "topup" ? "topup" : "plan";
  const plan = body?.plan;

  const serviceId = await getMyServiceId();
  if (!serviceId) {
    return NextResponse.json({ error: "No service found for your account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: access } = await admin
    .from("service_access")
    .select("stripe_customer_id")
    .eq("service_id", serviceId)
    .maybeSingle();

  let customerId = access?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { service_id: serviceId },
    });
    customerId = customer.id;
    await admin.from("service_access").update({ stripe_customer_id: customerId }).eq("service_id", serviceId);
  }

  if (kind === "topup") {
    const priceId = topupPriceId();
    if (!priceId) {
      return NextResponse.json({ error: "Top-up isn't configured yet." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/billing?topup=success`,
      cancel_url: `${SITE_URL}/billing?topup=cancelled`,
      metadata: { service_id: serviceId, type: "topup" },
    });
    return NextResponse.json({ url: session.url });
  }

  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ error: `The ${plan} plan isn't configured yet.` }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/billing?checkout=success`,
    cancel_url: `${SITE_URL}/billing?checkout=cancelled`,
    metadata: { service_id: serviceId, plan },
    subscription_data: { metadata: { service_id: serviceId, plan } },
  });

  return NextResponse.json({ url: session.url });
}
