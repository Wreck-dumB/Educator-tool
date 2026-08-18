import type { Metadata } from "next";
import Link from "next/link";
import { getBillingState, getCreditLedger } from "@/lib/supabase/billing";
import { PLAN_CREDIT_ALLOWANCE, PLAN_PRICE_AUD, type Plan } from "@/lib/stripe";
import { ChoosePlanButton, BuyTopupButton, ManageBillingButton } from "./BillingActions";

export const metadata: Metadata = { title: "Billing · DR. SparkPlay" };

const PLANS: { plan: Plan; blurb: string }[] = [
  { plan: "starter", blurb: "One room, the essentials." },
  { plan: "standard", blurb: "Unlimited rooms, more headroom." },
  { plan: "premium", blurb: "Pooled credits, branded parent portal." },
];

const REASON_LABELS: Record<string, string> = {
  subscription_renewal: "Monthly renewal",
  topup_purchase: "Credit top-up",
};

function labelForReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const billingConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const state = await getBillingState();
  const ledger = state.plan ? await getCreditLedger() : [];

  const pct = state.creditMonthlyAllowance > 0 ? Math.round((state.creditBalance / state.creditMonthlyAllowance) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Billing</h1>
        <p className="mt-1 text-sm text-ink/60">
          Creating a new document uses a credit. Reviewing, maintaining, and running what you&apos;ve already made — QIP
          check-ins, reflections, logging, follow-ups — is always unlimited, on every plan.
        </p>
      </div>

      {welcome && !state.plan && (
        <div className="rounded-2xl border border-coral bg-coral-light p-4 text-sm text-ink">
          Your service is set up. Choose a plan when you&apos;re ready to subscribe, or{" "}
          <Link href="/generate" className="font-medium text-coral-dark underline">
            start on the free trial for now
          </Link>
          .
        </div>
      )}

      {!billingConfigured && (
        <div className="rounded-2xl border border-amber bg-amber-light p-4 text-sm text-ink">
          Billing isn&apos;t configured on this environment yet — generation currently runs unmetered. See{" "}
          <code className="text-xs">docs/stripe-setup.md</code>.
        </div>
      )}

      {state.plan ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Current plan</p>
              <p className="mt-1 text-xl font-semibold capitalize text-ink">{state.plan}</p>
              <p className="mt-0.5 text-sm text-ink/50">
                ${PLAN_PRICE_AUD[state.plan]}/mo · renews {fmtDate(state.creditResetAt)}
                {state.stripeSubscriptionStatus && state.stripeSubscriptionStatus !== "active"
                  ? ` · ${state.stripeSubscriptionStatus}`
                  : ""}
              </p>
            </div>
            <ManageBillingButton />
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">Creation credits</span>
              <span className="tabular-nums text-ink/60">
                {state.creditBalance} / {state.creditMonthlyAllowance} left
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-sage transition-all"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            {state.creditBalance === 0 && (
              <p className="mt-2 text-xs text-red-600">
                Out of credits for this cycle — top up below or wait for renewal on {fmtDate(state.creditResetAt)}.
              </p>
            )}
          </div>

          <div className="mt-5">
            <BuyTopupButton />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map(({ plan, blurb }) => (
            <div key={plan} className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5">
              <div>
                <p className="font-display text-lg font-semibold capitalize text-ink">{plan}</p>
                <p className="text-sm text-ink/50">{blurb}</p>
              </div>
              <p className="text-2xl font-semibold text-ink">
                ${PLAN_PRICE_AUD[plan]}
                <span className="text-sm font-normal text-ink/40">/mo</span>
              </p>
              <p className="text-xs text-ink/50">{PLAN_CREDIT_ALLOWANCE[plan]} creation credits / month</p>
              <ChoosePlanButton plan={plan} />
            </div>
          ))}
        </div>
      )}

      {ledger.length > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Usage history</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 pr-4 text-ink/50">{fmtDate(entry.createdAt)}</td>
                    <td className="py-2 pr-4 text-ink">{labelForReason(entry.reason)}</td>
                    <td className={`py-2 text-right tabular-nums ${entry.delta < 0 ? "text-ink/60" : "text-sage-dark"}`}>
                      {entry.delta > 0 ? "+" : ""}
                      {entry.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
