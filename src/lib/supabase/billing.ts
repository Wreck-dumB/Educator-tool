import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/stripe";

export interface BillingState {
  serviceId: string | null;
  plan: Plan | null;
  creditBalance: number;
  creditMonthlyAllowance: number;
  creditResetAt: string | null;
  stripeSubscriptionStatus: string | null;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
}

/** Resolves the caller's own services.id via the my_service_id() RPC
 * (migration 0065) — distinct from getMyServiceOwnerId(), which returns the
 * director's auth uid, not the services row's own primary key that billing
 * rows are keyed by. */
export async function getMyServiceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_service_id");
  return data ?? null;
}

export async function getBillingState(): Promise<BillingState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_access")
    .select("service_id, plan, credit_balance, credit_monthly_allowance, credit_reset_at, stripe_subscription_status")
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { serviceId: null, plan: null, creditBalance: 0, creditMonthlyAllowance: 0, creditResetAt: null, stripeSubscriptionStatus: null };
  }

  return {
    serviceId: data.service_id,
    plan: (data.plan as Plan | null) ?? null,
    creditBalance: data.credit_balance,
    creditMonthlyAllowance: data.credit_monthly_allowance,
    creditResetAt: data.credit_reset_at,
    stripeSubscriptionStatus: data.stripe_subscription_status,
  };
}

export async function getCreditLedger(limit = 30): Promise<CreditLedgerEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_ledger")
    .select("id, delta, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    delta: row.delta,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

// Service-role write paths for the Stripe webhook (runs with no user
// session), keyed by service_id directly rather than the RLS-scoped RPCs
// above which rely on auth.uid(). Split by event so a status ping never
// accidentally re-grants credits and a renewal never accidentally forgets to.

function statusToAccessStatus(status: string): "active" | "suspended" {
  return status === "active" || status === "trialing" ? "active" : "suspended";
}

/** checkout.session.completed (subscription mode) — links Stripe IDs and
 * records the chosen plan. Deliberately does NOT grant credits: the
 * subscription's first invoice.paid event fires immediately after and is
 * the single source of truth for credit grants, so linking here can't
 * double-grant if both events are ever retried by Stripe. */
export async function recordSubscriptionLink(params: {
  serviceId: string;
  plan: Plan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionStatus: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_access")
    .update({
      plan: params.plan,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      stripe_subscription_status: params.stripeSubscriptionStatus,
      status: statusToAccessStatus(params.stripeSubscriptionStatus),
    })
    .eq("service_id", params.serviceId);
  if (error) throw new Error(error.message);
}

/** invoice.paid — the authoritative renewal signal. Resets the credit
 * balance to the plan's monthly allowance and updates the allowance/plan
 * defensively in case the price changed (upgrade/downgrade via the portal
 * takes effect on the next invoice). */
export async function renewCredits(params: { serviceId: string; plan: Plan; amount: number }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_access")
    .update({ plan: params.plan, credit_monthly_allowance: params.amount })
    .eq("service_id", params.serviceId);
  if (error) throw new Error(error.message);

  const { error: rpcError } = await admin.rpc("grant_credits", {
    p_service_id: params.serviceId,
    p_amount: params.amount,
    p_reason: "subscription_renewal",
    p_reset: true,
  });
  if (rpcError) throw new Error(rpcError.message);
}

/** checkout.session.completed (one-off payment mode) — a credit top-up
 * purchase, added on top of the existing balance rather than replacing it. */
export async function addTopupCredits(serviceId: string, amount: number) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("grant_credits", {
    p_service_id: serviceId,
    p_amount: amount,
    p_reason: "topup_purchase",
    p_reset: false,
  });
  if (error) throw new Error(error.message);
}

/** customer.subscription.updated / deleted — status-only change (pause,
 * past_due, cancellation). Never touches plan or credit balance. */
export async function setSubscriptionStatus(serviceId: string, stripeSubscriptionStatus: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_access")
    .update({
      stripe_subscription_status: stripeSubscriptionStatus,
      status: statusToAccessStatus(stripeSubscriptionStatus),
    })
    .eq("service_id", serviceId);
  if (error) throw new Error(error.message);
}

export async function findServiceIdByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("service_access")
    .select("service_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return data?.service_id ?? null;
}
