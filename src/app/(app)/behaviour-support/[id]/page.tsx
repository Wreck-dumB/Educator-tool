import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import {
  getBehaviourSupportPlan,
  getFamilyResponsesForPlan,
  STATUS_LABELS,
  STATUS_COLOURS,
  FREQUENCY_LABELS,
} from "@/lib/supabase/behaviour-support";
import { cardClass } from "@/lib/ui";
import { updateBehaviourSupportPlan, deleteBehaviourSupportPlan } from "../actions";
import { BSPEditForm } from "./BSPEditForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Behaviour Support Plan · DR. SparkPlay" };

export default async function BSPDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const [plan, familyResponses] = await Promise.all([
    getBehaviourSupportPlan(id),
    getFamilyResponsesForPlan(id),
  ]);

  if (!plan) notFound();

  const { data: child } = await supabase
    .from("children")
    .select("first_name")
    .eq("id", plan.child_id)
    .single();

  const childName = child?.first_name ?? "Unknown";
  const isOverdue =
    plan.review_date &&
    new Date(plan.review_date) < new Date() &&
    plan.status !== "archived";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/behaviour-support"
            className="text-xs font-medium text-ink/40 hover:text-coral-dark"
          >
            ← All plans
          </Link>
          <h1 className="mt-1 font-display text-3xl font-semibold text-coral-dark">
            {childName}&apos;s Behaviour Support Plan
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[plan.status]}`}
            >
              {STATUS_LABELS[plan.status]}
            </span>
            <span className="text-xs text-ink/40">
              Created{" "}
              {new Date(plan.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {plan.review_date && (
              <span
                className={`text-xs font-medium ${isOverdue ? "text-coral-dark" : "text-ink/40"}`}
              >
                {isOverdue ? "⚠️ Review overdue" : "Review"}{" "}
                {new Date(plan.review_date).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <form action={deleteBehaviourSupportPlan}>
          <input type="hidden" name="id" value={plan.id} />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-coral-light px-3 py-1.5 text-xs font-medium text-ink/40 hover:border-coral-dark hover:text-coral-dark"
            onClick={(e) => {
              if (!confirm("Delete this plan? This cannot be undone.")) e.preventDefault();
            }}
          >
            Delete
          </button>
        </form>
      </div>

      {/* Family responses */}
      {familyResponses.length > 0 && (
        <div className={`mt-6 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">
              Family responses
            </h2>
          </div>
          <ul className="divide-y divide-coral-light">
            {familyResponses.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {r.home_context && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                          Home context
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">
                          {r.home_context}
                        </p>
                      </div>
                    )}
                    {r.family_strategies && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                          Family strategies
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">
                          {r.family_strategies}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {r.acknowledged ? (
                      <span className="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
                        ✓ Acknowledged
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-ink/40">
                        Not yet acknowledged
                      </span>
                    )}
                    {r.acknowledged_at && (
                      <p className="mt-1 text-xs text-ink/30">
                        {new Date(r.acknowledged_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.status === "active" && familyResponses.length === 0 && (
        <div className={`mt-6 border-sage-light bg-sage-light/20 px-4 py-3 ${cardClass}`}>
          <p className="text-sm text-sage-dark">
            This plan is active — linked parents can view it and submit their family response from
            the parent portal.
          </p>
        </div>
      )}

      {/* Edit form */}
      <div className="mt-6">
        <BSPEditForm plan={plan} childName={childName} />
      </div>
    </div>
  );
}
