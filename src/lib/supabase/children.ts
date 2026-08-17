import { createClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/encryption";
import type { ChildProfile, ChildInvite, ChildContact } from "@/lib/types/domain";

// additional_needs may be encrypted at rest (see lib/encryption.ts) — every
// read path for a children row must decrypt it before the value is used.
function decryptChild<T extends { additional_needs: string | null }>(child: T): T {
  return { ...child, additional_needs: decryptField(child.additional_needs) };
}

export async function getChildren(): Promise<ChildProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("children")
    .select("*")
    .order("first_name");

  return (data ?? []).map(decryptChild);
}

export async function getChild(id: string): Promise<ChildProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("*").eq("id", id).maybeSingle();
  return data ? decryptChild(data) : null;
}

export async function getChildContacts(childId: string): Promise<ChildContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("child_contacts")
    .select("*")
    .eq("child_id", childId)
    .order("created_at");
  return data ?? [];
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
