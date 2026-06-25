import Link from "next/link";
import { getRiskAssessments } from "@/lib/supabase/riskAssessments";
import { getRiskRatingBadgeClass } from "@/lib/icons";
import { cardClass } from "@/lib/ui";

export default async function RiskAssessmentsPage() {
  const assessments = await getRiskAssessments();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Risk assessment library</h1>
      <p className="mt-1 text-sm text-ink/60">
        Baseline drafts generated from your saved activities. Each is a starting point — review and
        finalize before relying on it, and use the separate excursion/sleep-rest/emergency
        processes where those apply.
      </p>

      <div className="mt-6 space-y-4">
        {assessments.length === 0 && (
          <p className="text-sm text-ink/50">
            No risk assessments yet — open a saved activity and generate one.
          </p>
        )}
        {assessments.map((a) => {
          const ratings = a.hazards.map((h) => h.risk_rating);
          const highestRating = ["extreme", "high", "medium", "low"].find((r) => ratings.includes(r as never));
          return (
            <Link
              key={a.id}
              href={`/risk-assessments/${a.id}`}
              className={`block p-4 ${cardClass} transition-colors hover:border-coral`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-ink">{a.title}</h2>
                {highestRating && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${getRiskRatingBadgeClass(highestRating)}`}>
                    {highestRating}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {a.hazards.length} hazard{a.hazards.length === 1 ? "" : "s"} identified &middot;{" "}
                {a.reviewed_at ? (
                  <span className="text-sage-dark">Reviewed {new Date(a.reviewed_at).toLocaleDateString()}</span>
                ) : (
                  <span className="text-amber-dark">Unreviewed draft</span>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
