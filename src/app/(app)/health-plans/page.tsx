import type { Metadata } from "next";
import Link from "next/link";
import { getHealthPlans } from "@/lib/supabase/healthPlans";
import { getChildren } from "@/lib/supabase/children";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass, inputClass, primaryButtonClass, errorBannerClass } from "@/lib/ui";
import { createHealthPlan, archiveHealthPlan } from "./actions";

export const metadata: Metadata = { title: "Health Plans · SparkPlay" };

const PLAN_TYPE_LABELS: Record<string, string> = {
  asthma: "Asthma",
  anaphylaxis: "Anaphylaxis",
  diabetes: "Diabetes",
  allergies: "Allergies",
  epilepsy: "Epilepsy",
  other: "Other",
};

const PLAN_TYPE_COLOURS: Record<string, string> = {
  anaphylaxis: "bg-coral-light text-coral-dark",
  asthma: "bg-amber-light text-amber-dark",
  diabetes: "bg-sage-light text-sage-dark",
  epilepsy: "bg-coral-light text-coral-dark",
  allergies: "bg-amber-light text-amber-dark",
  other: "bg-ink/10 text-ink/60",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function HealthPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [plans, children, myRole] = await Promise.all([
    getHealthPlans(),
    getChildren(),
    getMyStaffRole(),
  ]);

  const childMap = new Map(children.map((c) => [c.id, c.first_name]));
  const canManage = myRole === "director" || myRole === "2ic";

  const today = new Date().toISOString().slice(0, 10);
  const expired = plans.filter((p) => p.review_date && p.review_date < today);
  const dueSoon = plans.filter((p) => {
    const d = daysUntil(p.review_date);
    return d !== null && d >= 0 && d <= 30;
  });
  const current = plans.filter(
    (p) => !p.review_date || (p.review_date >= today && daysUntil(p.review_date)! > 30),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Health &amp; Medical Plans</h1>
      <p className="mt-1 text-sm text-ink/60">
        Asthma, anaphylaxis, diabetes, and other management plans required under Regulation 90.
        All staff can view; 2IC+ can create and update.
      </p>

      {error && <p className={errorBannerClass}>{error}</p>}

      {/* Expired / due soon alerts */}
      {(expired.length > 0 || dueSoon.length > 0) && (
        <div className="mt-4 rounded-2xl border-l-4 border-coral bg-coral-light/40 p-4">
          <h2 className="font-display text-sm font-semibold text-coral-dark">Plans needing attention</h2>
          <ul className="mt-2 space-y-1.5">
            {expired.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <strong>{childMap.get(p.child_id) ?? "Unknown"}</strong> — {p.plan_name}
                  <span className="ml-2 rounded-full bg-coral px-2 py-0.5 text-xs font-semibold text-white">
                    Expired {new Date(p.review_date!).toLocaleDateString("en-AU")}
                  </span>
                </span>
              </li>
            ))}
            {dueSoon.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <strong>{childMap.get(p.child_id) ?? "Unknown"}</strong> — {p.plan_name}
                  <span className="ml-2 rounded-full bg-amber-light px-2 py-0.5 text-xs font-semibold text-amber-dark">
                    Due {new Date(p.review_date!).toLocaleDateString("en-AU")} ({daysUntil(p.review_date)}d)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add plan form */}
      {canManage && (
        <div className={`mt-6 p-5 ${cardClass}`}>
          <h2 className="font-display text-sm font-semibold text-ink">Add a plan</h2>
          <form action={createHealthPlan} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60">Child</label>
                <select name="child_id" required className={inputClass}>
                  <option value="">Select…</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60">Plan type</label>
                <select name="plan_type" required className={inputClass}>
                  {Object.entries(PLAN_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <input name="plan_name" type="text" required placeholder="Plan name (e.g. Asthma Action Plan — Luca)" className={inputClass} />
            <textarea name="triggers" rows={2} placeholder="Known triggers (optional)" className={inputClass} />
            <textarea name="signs_and_symptoms" rows={2} placeholder="Signs and symptoms to watch for (optional)" className={inputClass} />
            <textarea name="emergency_steps" rows={3} required placeholder="Emergency steps — what to do if the condition occurs" className={inputClass} />
            <input name="emergency_medication" type="text" placeholder="Emergency medication (e.g. EpiPen auto-injector 0.3mg — in red bag)" className={inputClass} />
            <div>
              <label className="block text-xs font-medium text-ink/60">Review / expiry date</label>
              <input name="review_date" type="date" className={inputClass} />
            </div>
            <button type="submit" className={`w-full ${primaryButtonClass}`}>Save plan</button>
          </form>
        </div>
      )}

      {/* Plan list */}
      {[
        { label: "Current plans", items: current },
        { label: "Due for review soon", items: dueSoon },
        { label: "Expired — needs renewal", items: expired },
      ]
        .filter(({ items }) => items.length > 0)
        .map(({ label, items }) => (
          <div key={label} className={`mt-6 ${cardClass}`}>
            <div className="border-b border-coral-light px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-ink">{label}</h2>
            </div>
            <ul className="divide-y divide-coral-light">
              {items.map((plan) => (
                <li key={plan.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_TYPE_COLOURS[plan.plan_type] ?? "bg-ink/10 text-ink/60"}`}>
                          {PLAN_TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                        </span>
                        <span className="font-medium text-sm text-ink">{childMap.get(plan.child_id) ?? "Unknown"}</span>
                        <span className="text-sm text-ink/60">— {plan.plan_name}</span>
                      </div>
                      {plan.review_date && (
                        <p className="mt-1 text-xs text-ink/50">
                          Review: {new Date(plan.review_date).toLocaleDateString("en-AU")}
                        </p>
                      )}
                      {plan.triggers && (
                        <p className="mt-2 text-xs text-ink/60"><strong>Triggers:</strong> {plan.triggers}</p>
                      )}
                      {plan.signs_and_symptoms && (
                        <p className="mt-1 text-xs text-ink/60"><strong>Signs:</strong> {plan.signs_and_symptoms}</p>
                      )}
                      <p className="mt-2 rounded-xl bg-coral-light/50 px-3 py-2 text-xs font-medium text-ink">
                        <strong>Emergency steps:</strong> {plan.emergency_steps}
                      </p>
                      {plan.emergency_medication && (
                        <p className="mt-1 text-xs text-ink/60"><strong>Medication:</strong> {plan.emergency_medication}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <Link
                          href={`/health-plans/${plan.id}/edit`}
                          className="text-xs font-medium text-sage-dark hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={archiveHealthPlan}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button type="submit" className="text-xs text-coral-dark hover:underline">
                            Archive
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {plans.length === 0 && (
        <p className="mt-8 text-center text-sm text-ink/40">No active health plans. Add one above.</p>
      )}
    </div>
  );
}
