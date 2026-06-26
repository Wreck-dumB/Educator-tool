import { createClient } from "@/lib/supabase/server";
import type { EylfOutcome, OutcomeCoverage } from "@/lib/types/domain";

export async function getEylfOutcomes(): Promise<EylfOutcome[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("eylf_outcomes").select("*").order("code");
  return data ?? [];
}

/**
 * How recently/often each EYLF outcome has been covered by logged observations,
 * within the trailing window. Sorted least-covered first, so the program
 * planner can surface "what's needed" rather than what's already well-covered.
 */
export async function getOutcomeCoverage(windowDays = 30): Promise<OutcomeCoverage[]> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: outcomes }, { data: observations }] = await Promise.all([
    supabase.from("eylf_outcomes").select("*").order("code"),
    supabase.from("observations").select("id, observed_at").gte("observed_at", cutoff),
  ]);

  if (!outcomes) return [];
  if (!observations || observations.length === 0) {
    return outcomes.map((o) => ({
      code: o.code,
      outcomeNumber: o.outcome_number,
      outcomeTitle: o.outcome_title,
      subOutcomeText: o.sub_outcome_text,
      timesCovered: 0,
      lastCoveredAt: null,
    }));
  }

  const { data: links } = await supabase
    .from("observation_eylf_links")
    .select("observation_id, eylf_outcome_id")
    .in("observation_id", observations.map((o) => o.id));

  const observedAtById = new Map(observations.map((o) => [o.id, o.observed_at]));
  const statsByOutcomeId = new Map<string, { count: number; lastAt: string }>();
  for (const link of links ?? []) {
    const observedAt = observedAtById.get(link.observation_id);
    if (!observedAt) continue;
    const existing = statsByOutcomeId.get(link.eylf_outcome_id);
    if (existing) {
      existing.count += 1;
      if (observedAt > existing.lastAt) existing.lastAt = observedAt;
    } else {
      statsByOutcomeId.set(link.eylf_outcome_id, { count: 1, lastAt: observedAt });
    }
  }

  const coverage = outcomes.map((o) => {
    const stats = statsByOutcomeId.get(o.id);
    return {
      code: o.code,
      outcomeNumber: o.outcome_number,
      outcomeTitle: o.outcome_title,
      subOutcomeText: o.sub_outcome_text,
      timesCovered: stats?.count ?? 0,
      lastCoveredAt: stats?.lastAt ?? null,
    };
  });

  return coverage.sort((a, b) => a.timesCovered - b.timesCovered);
}
