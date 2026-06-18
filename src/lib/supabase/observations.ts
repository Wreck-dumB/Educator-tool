import { createClient } from "@/lib/supabase/server";
import type { Observation } from "@/lib/types/domain";

export interface ObservationWithDetails extends Observation {
  child_name: string;
  activity_title: string | null;
  eylf_codes: string[];
}

export async function getObservations(childId?: string): Promise<ObservationWithDetails[]> {
  const supabase = await createClient();
  let query = supabase.from("observations").select("*").order("observed_at", { ascending: false });
  if (childId) {
    query = query.eq("child_id", childId);
  }
  const { data: observations } = await query;
  if (!observations || observations.length === 0) return [];

  const [{ data: children }, { data: activities }, { data: links }, { data: outcomes }] =
    await Promise.all([
      supabase.from("children").select("id, first_name"),
      supabase.from("generated_activities").select("id, title"),
      supabase
        .from("observation_eylf_links")
        .select("observation_id, eylf_outcome_id")
        .in("observation_id", observations.map((o) => o.id)),
      supabase.from("eylf_outcomes").select("id, code"),
    ]);

  const childNameById = new Map((children ?? []).map((c) => [c.id, c.first_name]));
  const activityTitleById = new Map((activities ?? []).map((a) => [a.id, a.title]));
  const codeById = new Map((outcomes ?? []).map((o) => [o.id, o.code]));

  const codesByObservation = new Map<string, string[]>();
  for (const link of links ?? []) {
    const code = codeById.get(link.eylf_outcome_id);
    if (!code) continue;
    const arr = codesByObservation.get(link.observation_id) ?? [];
    arr.push(code);
    codesByObservation.set(link.observation_id, arr);
  }

  return observations.map((o) => ({
    ...o,
    child_name: childNameById.get(o.child_id) ?? "Unknown",
    activity_title: o.activity_id ? activityTitleById.get(o.activity_id) ?? null : null,
    eylf_codes: (codesByObservation.get(o.id) ?? []).sort(),
  }));
}
