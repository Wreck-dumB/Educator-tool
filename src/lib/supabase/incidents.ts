import { createClient } from "@/lib/supabase/server";
import type { ChildIncidentReport, StaffIncidentReport } from "@/lib/types/domain";

export interface IncidentAlert {
  childId: string;
  childName: string;
  count7d: number;
  count30d: number;
}

// Returns children with 3+ incidents in the last 7 days or 5+ in the last 30.
export async function getIncidentAlerts(): Promise<IncidentAlert[]> {
  const supabase = await createClient();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: incidents }, { data: children }] = await Promise.all([
    supabase
      .from("child_incident_reports")
      .select("child_id, occurred_at")
      .gte("occurred_at", since30d)
      .order("occurred_at", { ascending: false }),
    supabase.from("children").select("id, first_name"),
  ]);

  if (!incidents || incidents.length === 0) return [];

  const childNameMap = new Map((children ?? []).map((c) => [c.id, c.first_name]));
  const now = Date.now();
  const cutoff7d = now - 7 * 24 * 60 * 60 * 1000;

  const byChild = new Map<string, { count7d: number; count30d: number }>();
  for (const row of incidents) {
    const existing = byChild.get(row.child_id) ?? { count7d: 0, count30d: 0 };
    existing.count30d += 1;
    if (new Date(row.occurred_at).getTime() >= cutoff7d) existing.count7d += 1;
    byChild.set(row.child_id, existing);
  }

  return Array.from(byChild.entries())
    .filter(([, v]) => v.count7d >= 3 || v.count30d >= 5)
    .map(([childId, v]) => ({
      childId,
      childName: childNameMap.get(childId) ?? "Unknown child",
      count7d: v.count7d,
      count30d: v.count30d,
    }))
    .sort((a, b) => b.count7d - a.count7d || b.count30d - a.count30d);
}

export async function getChildIncidentReports(): Promise<ChildIncidentReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_incident_reports")
    .select("*")
    .order("occurred_at", { ascending: false });
  return data ?? [];
}

export async function getStaffIncidentReports(): Promise<StaffIncidentReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_incident_reports")
    .select("*")
    .order("occurred_at", { ascending: false });
  return data ?? [];
}

export async function getChildIncidentReportsByChild(childId: string): Promise<ChildIncidentReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_incident_reports")
    .select("*")
    .eq("child_id", childId)
    .order("occurred_at", { ascending: false });
  return data ?? [];
}
