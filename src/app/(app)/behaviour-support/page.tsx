import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getBehaviourSupportPlans, STATUS_LABELS, STATUS_COLOURS } from "@/lib/supabase/behaviour-support";
import { cardClass } from "@/lib/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Behaviour Support Plans · DR. SparkPlay",
};

export default async function BehaviourSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/");

  const plans = await getBehaviourSupportPlans(ownerUserId);

  const active = plans.filter((p) => p.status === "active");
  const drafts = plans.filter((p) => p.status === "draft");
  const review = plans.filter((p) => p.status === "under_review");
  const archived = plans.filter((p) => p.status === "archived");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">
            Behaviour Support Plans
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Collaborative plans created with families to support consistent approaches at the service
            and at home.
          </p>
        </div>
        <Link
          href="/behaviour-support/new"
          className="shrink-0 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
        >
          + New plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className={`mt-6 p-8 text-center ${cardClass}`}>
          <p className="text-sm text-ink/50">No behaviour support plans yet.</p>
          <Link
            href="/behaviour-support/new"
            className="mt-3 inline-block rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
          >
            Create the first plan
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[
            { label: "Active", items: active },
            { label: "Under Review", items: review },
            { label: "Drafts", items: drafts },
            { label: "Archived", items: archived },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                  {group.label}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((plan) => {
                    const isOverdue =
                      plan.review_date &&
                      new Date(plan.review_date) < new Date() &&
                      plan.status !== "archived";
                    return (
                      <li key={plan.id}>
                        <Link
                          href={`/behaviour-support/${plan.id}`}
                          className={`flex items-start justify-between gap-4 p-4 transition-colors hover:bg-coral-light/20 ${cardClass}`}
                        >
                          <div className="min-w-0">
                            <p className="font-display text-base font-semibold text-ink">
                              🧒 {plan.child_first_name}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-sm text-ink/60">
                              {plan.behaviour_description}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {plan.review_date && (
                                <span
                                  className={`rounded-full px-2 py-0.5 font-medium ${
                                    isOverdue
                                      ? "bg-coral-light text-coral-dark"
                                      : "bg-ink/5 text-ink/50"
                                  }`}
                                >
                                  {isOverdue ? "Review overdue" : "Review"}{" "}
                                  {new Date(plan.review_date).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                              <span className="text-ink/30">
                                Created{" "}
                                {new Date(plan.created_at).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOURS[plan.status]}`}
                          >
                            {STATUS_LABELS[plan.status]}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
