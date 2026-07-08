import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { Database } from "@/lib/types/database.types";

export type Excursion = Database["public"]["Tables"]["excursions"]["Row"];

export async function getExcursions(): Promise<Excursion[]> {
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("excursions")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("excursion_date", { ascending: false });
  return data ?? [];
}

export async function getExcursion(id: string): Promise<Excursion | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("excursions").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getExcursionAttendees(excursionId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("excursion_attendees")
    .select("child_id")
    .eq("excursion_id", excursionId);
  return (data ?? []).map((r) => r.child_id);
}
