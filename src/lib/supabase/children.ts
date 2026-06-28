import { createClient } from "@/lib/supabase/server";
import type { ChildProfile, ChildInvite } from "@/lib/types/domain";

export async function getChildren(): Promise<ChildProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("children")
    .select("*")
    .order("first_name");

  return data ?? [];
}

export async function getChild(id: string): Promise<ChildProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getChildInvites(childId: string): Promise<ChildInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_invites")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
