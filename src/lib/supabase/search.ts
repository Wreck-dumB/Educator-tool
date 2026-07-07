import { createClient } from "@/lib/supabase/server";

export interface SearchResults {
  children: { id: string; name: string }[];
  observations: { id: string; childId: string; childName: string; note: string; date: string }[];
  activities: { id: string; title: string; summary: string }[];
  policies: { id: string; title: string }[];
  forms: { id: string; title: string }[];
}

export async function globalSearch(query: string): Promise<SearchResults> {
  if (!query.trim()) {
    return { children: [], observations: [], activities: [], policies: [], forms: [] };
  }

  const supabase = await createClient();
  const q = `%${query.trim()}%`;

  const [
    { data: children },
    { data: obsRaw },
    { data: activitiesByTitle },
    { data: activitiesBySummary },
    { data: policies },
    { data: forms },
    { data: obsChildren },
  ] = await Promise.all([
    supabase.from("children").select("id, first_name").ilike("first_name", q).limit(8),
    supabase
      .from("observations")
      .select("id, child_id, note_text, observed_at")
      .ilike("note_text", q)
      .order("observed_at", { ascending: false })
      .limit(10),
    supabase.from("generated_activities").select("id, title, summary").ilike("title", q).eq("is_archived", false).limit(8),
    supabase.from("generated_activities").select("id, title, summary").ilike("summary", q).eq("is_archived", false).limit(8),
    supabase.from("policies").select("id, title").ilike("title", q).limit(6),
    supabase.from("form_templates").select("id, title").ilike("title", q).limit(6),
    supabase.from("children").select("id, first_name"),
  ]);

  const seenActivityIds = new Set<string>();
  const activities = [...(activitiesByTitle ?? []), ...(activitiesBySummary ?? [])].filter((a) => {
    if (seenActivityIds.has(a.id)) return false;
    seenActivityIds.add(a.id);
    return true;
  }).slice(0, 8);

  const childNameById = new Map((obsChildren ?? []).map((c) => [c.id, c.first_name]));

  return {
    children: (children ?? []).map((c) => ({ id: c.id, name: c.first_name })),
    observations: (obsRaw ?? []).map((o) => ({
      id: o.id,
      childId: o.child_id,
      childName: childNameById.get(o.child_id) ?? "Unknown",
      note: o.note_text,
      date: o.observed_at,
    })),
    activities: (activities ?? []).map((a) => ({ id: a.id, title: a.title, summary: a.summary })),
    policies: (policies ?? []).map((p) => ({ id: p.id, title: p.title })),
    forms: (forms ?? []).map((f) => ({ id: f.id, title: f.title })),
  };
}
