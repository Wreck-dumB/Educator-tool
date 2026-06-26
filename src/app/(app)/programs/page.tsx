import Link from "next/link";
import { getOutcomeCoverage } from "@/lib/supabase/eylf";
import { getPrograms } from "@/lib/supabase/programs";
import { cardClass } from "@/lib/ui";
import ProgramPlannerClient from "./ProgramPlannerClient";

export default async function ProgramsPage() {
  const [coverage, programs] = await Promise.all([getOutcomeCoverage(30), getPrograms()]);
  const needsAttention = coverage.slice(0, 6);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Program planner</h1>
      <p className="mt-1 text-sm text-ink/60">
        Draft a fun, inclusive learning program for a date range — linked to EYLF outcomes, reusing
        your saved activities where they fit, and weaving in cultural &amp; national days. Built to
        keep program-writing fast so more time goes to the children.
      </p>

      {needsAttention.length > 0 && (
        <div className={`mt-6 p-4 ${cardClass}`}>
          <p className="text-sm font-medium text-ink">Outcomes needing attention (last 30 days)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsAttention.map((o) => (
              <span
                key={o.code}
                title={o.subOutcomeText}
                className="rounded-full bg-amber-light px-2.5 py-1 text-xs font-medium text-amber-dark"
              >
                {o.code} &middot; {o.timesCovered}x
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/50">
            These get priority when drafting a new program below.
          </p>
        </div>
      )}

      <ProgramPlannerClient />

      <div className="mt-6 space-y-4">
        {programs.length === 0 && <p className="text-sm text-ink/50">No programs saved yet.</p>}
        {programs.map((p) => (
          <Link key={p.id} href={`/programs/${p.id}`} className={`block p-4 ${cardClass} transition-colors hover:border-coral`}>
            <h2 className="font-display font-semibold text-ink">{p.title}</h2>
            <p className="mt-1 text-xs text-ink/50">
              {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
