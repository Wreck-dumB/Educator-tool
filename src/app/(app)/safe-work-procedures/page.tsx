import Link from "next/link";
import { getSafeWorkProcedures } from "@/lib/supabase/safeWorkProcedures";
import { getRiskRatingBadgeClass } from "@/lib/icons";
import { cardClass } from "@/lib/ui";
import SafeWorkProcedureForm from "./SafeWorkProcedureForm";

export default async function SafeWorkProceduresPage() {
  const procedures = await getSafeWorkProcedures();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Safe work procedures</h1>
      <p className="mt-1 text-sm text-ink/60">
        Baseline drafts for hazardous routine staff tasks — chemical use, manual handling, ladder use,
        garden tools, and similar. Not a legal &ldquo;SWMS&rdquo;, which is a specific term for high-risk
        construction work — this is a starting point for your own task safety procedures, to review
        and finalize with your nominated supervisor.
      </p>

      <div className="mt-6">
        <SafeWorkProcedureForm />
      </div>

      <div className="mt-6 space-y-4">
        {procedures.length === 0 && (
          <p className="text-sm text-ink/50">No safe work procedures saved yet.</p>
        )}
        {procedures.map((p) => {
          const ratings = p.hazards.map((h) => h.risk_rating);
          const highestRating = ["extreme", "high", "medium", "low"].find((r) => ratings.includes(r as never));
          return (
            <Link
              key={p.id}
              href={`/safe-work-procedures/${p.id}`}
              className={`block p-4 ${cardClass} transition-colors hover:border-coral`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-ink">{p.task_title}</h2>
                {highestRating && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${getRiskRatingBadgeClass(highestRating)}`}>
                    {highestRating}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {p.reviewed_at ? (
                  <span className="text-sage-dark">Reviewed {new Date(p.reviewed_at).toLocaleDateString()}</span>
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
