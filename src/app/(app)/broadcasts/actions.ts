"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";

export async function sendBroadcast(formData: FormData): Promise<{ error?: string; count?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") return { error: "Only Director or 2IC can send broadcasts" };

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const target = (formData.get("target") as string) || "all_parents";

  if (!title) return { error: "Title is required" };
  if (!body) return { error: "Message body is required" };

  // Insert the broadcast record
  const { data: broadcastRow, error: broadcastError } = await supabase
    .from("broadcast_messages")
    .insert({
      owner_user_id: ownerUserId,
      created_by: user.id,
      title,
      body,
      target: target as never,
    })
    .select("id")
    .single();

  if (broadcastError) return { error: broadcastError.message };

  // Find all linked parents (unique) for this service
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("parent_user_id")
    .eq("educator_user_id", ownerUserId);

  if (!links || links.length === 0) {
    revalidatePath("/broadcasts");
    return { count: 0 };
  }

  // De-duplicate parent_user_ids
  const uniqueParents = [...new Set(links.map((l) => l.parent_user_id))];

  const notifications = uniqueParents.map((parentId) => ({
    recipient_user_id: parentId,
    type: "broadcast_message" as never,
    title,
    body,
    href: null,
  }));

  await supabase.from("parent_notifications").insert(notifications);

  revalidatePath("/broadcasts");
  return { count: uniqueParents.length };
}

export async function deleteBroadcast(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return { error: "No active service" };

  const myRole = await getMyStaffRole();
  if (myRole !== "director") return { error: "Only the Director can delete broadcasts" };

  const { error } = await supabase
    .from("broadcast_messages")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);
  if (error) return { error: error.message };
  revalidatePath("/broadcasts");
  return {};
}
