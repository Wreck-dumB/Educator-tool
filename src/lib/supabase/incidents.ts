import { createClient } from "@/lib/supabase/server";
import type { ChildIncidentReport, StaffIncidentReport } from "@/lib/types/domain";

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
