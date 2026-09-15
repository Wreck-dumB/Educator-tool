import { createAdminClient } from "@/lib/supabase/admin";
import { getMyServiceId } from "@/lib/supabase/billing";

export type CreditCheckResult = { ok: true } | { ok: false; reason: "no_service" | "out_of_credits" };

/**
 * Gate for the ~14 "creation" endpoints listed in docs/pricing-and-credits.md.
 * Maintenance/review endpoints must never call this — they stay unmetered.
 *
 * Fails OPEN (returns ok:true) whenever there's nothing to enforce yet:
 * STRIPE_SECRET_KEY unset (billing not configured on this environment at
 * all — same fail-soft convention as isRateLimited()/sendEmail()), or the
 * service has never subscribed (plan is null). The second case is
 * deliberate, not a gap: service_access.status defaults every centre to
 * 'active'/'trial' today regardless of payment (see migration 0054's
 * backfill), so gating on "no plan" the moment Stripe keys are added would
 * instantly lock out every existing test-phase centre with no warning.
 * Enforcement only turns on, per service, once that service has actually
 * been through checkout and has a plan on record — a deliberate opt-in
 * rollout rather than a retroactive paywall.
 */
export async function checkAndConsumeCredit(reason: string): Promise<CreditCheckResult> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: true };

  const serviceId = await getMyServiceId();
  if (!serviceId) return { ok: false, reason: "no_service" };

  try {
    const admin = createAdminClient();
    const { data: access } = await admin
      .from("service_access")
      .select("plan")
      .eq("service_id", serviceId)
      .maybeSingle();

    if (!access?.plan) return { ok: true };

    const { data: consumed, error } = await admin.rpc("consume_credit", {
      p_service_id: serviceId,
      p_reason: reason,
    });

    if (error) {
      console.error("consume_credit failed:", error);
      return { ok: true }; // a billing-plumbing error must never block a real feature
    }

    return consumed ? { ok: true } : { ok: false, reason: "out_of_credits" };
  } catch (err) {
    console.error("checkAndConsumeCredit threw:", err);
    return { ok: true };
  }
}

/**
 * Compensating action for when a credit was already consumed via
 * checkAndConsumeCredit() but the generation it paid for then failed (e.g.
 * an AI backend outage) — without this, a failed attempt permanently burns
 * a real credit for nothing. Re-checks plan status itself rather than
 * trusting the caller, and is a no-op (not an error) for any service that
 * was never actually metered in the first place. Fails silently the same
 * way checkAndConsumeCredit does — a billing-plumbing error here must never
 * surface as a user-facing error on top of the generation failure that
 * triggered it.
 */
export async function refundCredit(reason: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return;

  try {
    const serviceId = await getMyServiceId();
    if (!serviceId) return;

    const admin = createAdminClient();
    const { data: access } = await admin
      .from("service_access")
      .select("plan")
      .eq("service_id", serviceId)
      .maybeSingle();

    if (!access?.plan) return;

    const { error } = await admin.rpc("grant_credits", {
      p_service_id: serviceId,
      p_amount: 1,
      p_reason: reason,
      p_reset: false,
    });
    if (error) console.error("refundCredit failed:", error);
  } catch (err) {
    console.error("refundCredit threw:", err);
  }
}

export function creditErrorResponse(reason: Exclude<CreditCheckResult, { ok: true }>["reason"]): { error: string } {
  switch (reason) {
    case "no_service":
      return { error: "No service found for your account yet." };
    case "out_of_credits":
      return { error: "You're out of creation credits for this cycle. Top up or upgrade to keep creating." };
  }
}
