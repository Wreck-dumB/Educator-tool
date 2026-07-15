import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/supabase/children";
import {
  getBSPsForParent,
  getMyFamilyResponse,
  STATUS_LABELS,
  STATUS_COLOURS,
  FREQUENCY_LABELS,
} from "@/lib/supabase/behaviour-support";
import { cardClass } from "@/lib/ui";
import { submitFamilyResponse } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Behaviour Support Plans · DR. SparkPlay" };

export default async function ParentBSPPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const children = await getChildren();
  if (children.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">
          Behaviour Support Plans
        </h1>
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No children are linked to your account yet.
        </p>
      </div>
    );
  }

  // Load all active/under-review BSPs for all linked children + our existing responses
  const allPlans = await Promise.all(
    children.map((c) => getBSPsForParent(c.id)),
  );
  const plansByChild = children.map((c, i) => ({
    child: c,
    plans: allPlans[i],
  }));

  const childrenWithPlans = plansByChild.filter((x) => x.plans.length > 0);

  if (childrenWithPlans.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-coral-dark">
          Behaviour Support Plans
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Plans created by your child&apos;s educators will appear here when they&apos;re ready to
          share with you.
        </p>
        <p className={`mt-6 p-5 text-sm text-ink/50 ${cardClass}`}>
          No active plans at the moment.
        </p>
      </div>
    );
  }

  // Load family responses for all plans
  const allPlanIds = childrenWithPlans.flatMap((x) => x.plans.map((p) => p.id));
  const responsesRaw = await Promise.all(
    allPlanIds.map((planId) => getMyFamilyResponse(planId, user.id)),
  );
  const responsesByPlan = new Map(
    allPlanIds.map((id, i) => [id, responsesRaw[i]]),
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-coral-dark">
        Behaviour Support Plans
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        These plans have been created by your child&apos;s educators. You can read the strategies,
        add your home approach, and acknowledge the plan.
      </p>
      <p className="mt-1 text-xs text-ink/40">
        These are confidential documents. They are not a clinical diagnosis — they are a shared
        approach to supporting your child&apos;s wellbeing at the service and at home.
      </p>

      <div className="mt-6 space-y-8">
        {childrenWithPlans.map(({ child, plans }) =>
          plans.map((plan) => {
            const response = responsesByPlan.get(plan.id) ?? null;
            return (
              <div key={plan.id} className={`${cardClass} overflow-hidden`}>
                {/* Plan header */}
                <div className="border-b border-coral-light bg-coral-light/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-base font-semibold text-ink">
                      {child.first_name}&apos;s support plan
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[plan.status]}`}
                    >
                      {STATUS_LABELS[plan.status]}
                    </span>
                  </div>
                  {plan.review_date && (
                    <p className="mt-0.5 text-xs text-ink/40">
                      Review date:{" "}
                      {new Date(plan.review_date).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <div className="space-y-4 px-4 py-4">
                  {/* Child context */}
                  {(plan.child_strengths || plan.child_interests) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {plan.child_strengths && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                            Strengths
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                            {plan.child_strengths}
                          </p>
                        </div>
                      )}
                      {plan.child_interests && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                            Current interests
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                            {plan.child_interests}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Behaviour */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                      Behaviour
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                      {plan.behaviour_description}
                    </p>
                    {plan.behaviour_triggers && (
                      <p className="mt-1 text-sm text-ink/60">
                        <span className="font-medium">Triggers:</span> {plan.behaviour_triggers}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink/40">
                      {FREQUENCY_LABELS[plan.behaviour_frequency]}
                    </p>
                    {plan.behaviour_function && (
                      <p className="mt-1 text-sm text-ink/60">
                        <span className="font-medium">Possible reason:</span>{" "}
                        {plan.behaviour_function}
                      </p>
                    )}
                  </div>

                  {/* Educator strategies */}
                  {plan.educator_strategies && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                        What we&apos;re doing at the service
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                        {plan.educator_strategies}
                      </p>
                    </div>
                  )}

                  {/* Educator-suggested family strategies */}
                  {plan.suggested_family_strategies && (
                    <div className="rounded-xl bg-sage-light/30 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-sage-dark">
                        Suggested home strategies
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                        {plan.suggested_family_strategies}
                      </p>
                    </div>
                  )}

                  {/* Environment adjustments */}
                  {plan.environment_adjustments && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                        Environment adjustments
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                        {plan.environment_adjustments}
                      </p>
                    </div>
                  )}

                  {/* External supports */}
                  {plan.external_support_notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                        External support professionals
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                        {plan.external_support_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Family response form */}
                <div className="border-t border-coral-light px-4 py-4">
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Your family&apos;s response
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/50">
                    Share what you see at home and the strategies you&apos;ll use. This is shared
                    with your child&apos;s educators.
                  </p>

                  {response?.acknowledged && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
                        ✓ You acknowledged this plan
                      </span>
                      {response.acknowledged_at && (
                        <span className="text-xs text-ink/30">
                          {new Date(response.acknowledged_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  <form action={submitFamilyResponse} className="mt-3 space-y-3">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="child_id" value={child.id} />

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                        What do you notice at home?
                      </label>
                      <textarea
                        name="home_context"
                        defaultValue={response?.home_context ?? ""}
                        rows={3}
                        placeholder="What does this behaviour look like at home? What seems to help or make it worse?"
                        className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-ink/40">
                        Our family strategies
                      </label>
                      <textarea
                        name="family_strategies"
                        defaultValue={response?.family_strategies ?? ""}
                        rows={3}
                        placeholder="What will you try at home? You can adapt the suggestions above or add your own."
                        className="w-full resize-none rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none"
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          name="acknowledged"
                          value="1"
                          defaultChecked={response?.acknowledged ?? false}
                          className="mt-0.5 accent-coral"
                        />
                        <span className="text-sm text-ink/70">
                          I have read this plan and understand the approach the service is taking.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
                    >
                      {response ? "Update response" : "Submit response"}
                    </button>
                  </form>
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
