import { createClient } from "@/lib/supabase/server";
import type { GeneratedActivity } from "@/lib/types/domain";

export interface ActivityWithOutcomes extends GeneratedActivity {
  eylf_codes: string[];
}

async function attachEylfCodes(
  activities: GeneratedActivity[],
): Promise<ActivityWithOutcomes[]> {
  if (activities.length === 0) return [];
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("activity_eylf_links")
    .select("activity_id, eylf_outcome_id")
    .in("activity_id", activities.map((a) => a.id));

  const { data: outcomes } = await supabase.from("eylf_outcomes").select("id, code");
  const codeById = new Map((outcomes ?? []).map((o) => [o.id, o.code]));

  const codesByActivity = new Map<string, string[]>();
  for (const link of links ?? []) {
    const code = codeById.get(link.eylf_outcome_id);
    if (!code) continue;
    const arr = codesByActivity.get(link.activity_id) ?? [];
    arr.push(code);
    codesByActivity.set(link.activity_id, arr);
  }

  return activities.map((a) => ({
    ...a,
    eylf_codes: (codesByActivity.get(a.id) ?? []).sort(),
  }));
}

export async function getActivities(): Promise<ActivityWithOutcomes[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_activities")
    .select("*")
    .order("created_at", { ascending: false });

  return attachEylfCodes(data ?? []);
}

export async function getActivitiesByIds(ids: string[]): Promise<ActivityWithOutcomes[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_activities")
    .select("*")
    .in("id", ids);
  return attachEylfCodes(data ?? []);
}

export async function getActivity(id: string): Promise<ActivityWithOutcomes | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_activities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const [withCodes] = await attachEylfCodes([data]);
  return withCodes;
}
