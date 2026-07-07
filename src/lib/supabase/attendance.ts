import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord } from "@/lib/types/domain";

export async function getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("date", date)
    .order("created_at");
  return data ?? [];
}
