import type { Metadata } from "next";
import Link from "next/link";
import { getOutcomeCoverage } from "@/lib/supabase/eylf";
import { getObservations } from "@/lib/supabase/observations";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Programming Workspace · SparkPlay" };

const OUTCOME_TITLES: Record<number, string> = {
  1: "Children have a strong sense of identity",
  2: "Children are connected with and contribute to their world",
  3: "Children have a strong sense of wellbeing",
  4: "Children are confident and involved learners",
  5: "Children are effective communicators",
};

function coverageColor(count: number): string {
  if (count === 0) return "bg-coral/20 border-coral text-coral-dark";
  if (count <= 2) return "bg-amber-100 border-amber-300 text-amber-800";
  if (count <= 5) return "bg-sage-light/60 border-sage text-sage-dark";
  return "bg-sage border-sage text-white";
}

function coverageBar(count: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((count / max) * 100);
}

export default async function ProgrammingPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const windowDays = parseInt(params.window ?? "30", 10) || 30;

  const [coverage, recentObs] = await Promise.all([
    getOutcomeCoverage(windowDays),
    getObservations(),
  ]);

  const recentObsSlice = recentObs.slice(0, 15);
  const maxCoverage = Math.max(...coverage.map((c) => c.timesCovered), 1);
  const totalObs = coverage.reduce((sum, c) => sum + c.timesCovered, 0);

  // Group by outcome number
  const grouped = new Map<number, typeof coverage>();
  for (const c of coverage) {
    const arr = grouped.get(c.outcomeNumber) ?? [];
    arr.push(c);
    grouped.set(c.outcomeNumber, arr);
  }

  const uncovered = coverage.filter((c) => c.timesCovered === 0);
  const low = coverage.filter((c) => c.timesCovered > 0 && c.timesCovered <= 2);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Programming Workspace</h1>
          <p className="mt-1 text-sm text-ink/60">
            EYLF coverage from the last {windowDays} days. Use gaps to plan what to do next.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink/50">Window:</span>
          {[14, 30, 60].map((d) => (
            <Link
              key={d}
              href={`/programming?window=${d}`}
              className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                windowDays === d
                  ? "border-coral bg-coral-light text-coral-dark"
                  : "border-coral-light text-ink/50 hover:bg-coral-light/40"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className={`${cardClass} p-4 text-center`}>
          <p className="font-display text-2xl font-bold text-coral-dark">{totalObs}</p>
          <p className="mt-0.5 text-xs text-ink/50">Observations logged</p>
        </div>
        <div className={`${cardClass} p-4 text-center`}>
          <p className="font-display text-2xl font-bold text-coral-dark">{uncovered.length}</p>
          <p className="mt-0.5 text-xs text-ink/50">Outcomes not covered</p>
        </div>
        <div className={`${cardClass} p-4 text-center`}>
          <p className="font-display text-2xl font-bold text-coral-dark">{low.length}</p>
          <p className="mt-0.5 text-xs text-ink/50">Outcomes covered once or twice</p>
        </div>
      </div>

      {/* Planning actions */}
      {(uncovered.length > 0 || low.length > 0) && (
        <div className={`mt-5 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-coral-dark">
              Plan activities to fill these gaps
            </h2>
            <p className="text-xs text-ink/50">Tap an outcome to open the generator pre-loaded with it.</p>
          </div>
          <ul className="divide-y divide-coral-light">
            {[...uncovered, ...low].map((c) => (
              <li key={c.code} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{c.code}</p>
                  <p className="truncate text-xs text-ink/50">{c.subOutcomeText}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.timesCovered === 0 ? (
                    <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral-dark">
                      Not covered
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {c.timesCovered}×
                    </span>
                  )}
                  <Link
                    href={`/generate?outcome=${encodeURIComponent(c.code)}`}
                    className="rounded-xl bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-dark"
                  >
                    Plan activity
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EYLF coverage by outcome area */}
      <div className={`mt-5 ${cardClass}`}>
        <div className="border-b border-coral-light px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Coverage by EYLF outcome</h2>
        </div>
        <div className="divide-y divide-coral-light">
          {[1, 2, 3, 4, 5].map((num) => {
            const outcomes = grouped.get(num) ?? [];
            const areaTotal = outcomes.reduce((s, c) => s + c.timesCovered, 0);
            return (
              <details key={num} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-cream/50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      Outcome {num}: {OUTCOME_TITLES[num]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-ink/50">{areaTotal} logged</span>
                    <svg className="h-4 w-4 text-ink/30 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <ul className="border-t border-coral-light/50 bg-cream/20 py-1">
                  {outcomes.map((c) => {
                    const pct = coverageBar(c.timesCovered, maxCoverage);
                    const cls = coverageColor(c.timesCovered);
                    return (
                      <li key={c.code} className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
                            {c.code}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-ink/60">{c.subOutcomeText}</p>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  c.timesCovered === 0 ? "bg-coral/30" : "bg-sage"
                                }`}
                                style={{ width: `${Math.max(pct, c.timesCovered > 0 ? 3 : 0)}%` }}
                              />
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-ink/60">{c.timesCovered}×</span>
                          {c.timesCovered === 0 && (
                            <Link
                              href={`/generate?outcome=${encodeURIComponent(c.code)}`}
                              className="shrink-0 text-xs font-semibold text-coral-dark hover:underline"
                            >
                              Plan →
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>

      {/* Recent observations for context */}
      {recentObsSlice.length > 0 && (
        <div className={`mt-5 ${cardClass}`}>
          <div className="border-b border-coral-light px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">Recent observations</h2>
            <p className="text-xs text-ink/50">What you&apos;ve noticed lately — use these as a springboard for your planning.</p>
          </div>
          <ul className="divide-y divide-coral-light">
            {recentObsSlice.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink line-clamp-2">{o.note_text}</p>
                    <p className="mt-0.5 text-xs text-ink/40">
                      {o.child_name} ·{" "}
                      {new Date(o.observed_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Australia/Sydney",
                      })}
                    </p>
                  </div>
                  {o.eylf_codes.length > 0 && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {o.eylf_codes.slice(0, 3).map((code) => (
                        <span key={code} className="rounded bg-sage-light px-1.5 py-0.5 text-[10px] font-semibold text-sage-dark">
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {recentObs.length > 15 && (
            <div className="border-t border-coral-light px-4 py-3">
              <Link href="/observations" className="text-sm font-medium text-coral-dark hover:underline">
                View all {recentObs.length} observations →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
