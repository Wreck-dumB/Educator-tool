import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type StaffReflection = Database["public"]["Tables"]["staff_reflections"]["Row"];

export async function getMyReflections(): Promise<StaffReflection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("staff_reflections")
    .select("*")
    .eq("author_user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAllServiceReflections(ownerUserId: string): Promise<StaffReflection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_reflections")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
