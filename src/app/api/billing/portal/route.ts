import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyServiceId } from "@/lib/supabase/billing";
import { getStripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST() {
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

  if (!access?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — choose a plan first." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: access.stripe_customer_id,
    return_url: `${SITE_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
