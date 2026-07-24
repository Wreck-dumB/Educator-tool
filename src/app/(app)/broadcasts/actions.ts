"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { getMyStaffRole } from "@/lib/supabase/staff";

export async function sendBroadcast(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myRole = await getMyStaffRole();
  if (myRole !== "director" && myRole !== "2ic") redirect("/broadcasts?error=" + encodeURIComponent("Only Director or 2IC can send broadcasts"));

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const target = (formData.get("target") as string) || "all_parents";

  if (!title) redirect("/broadcasts?error=" + encodeURIComponent("Title is required"));
  if (!body) redirect("/broadcasts?error=" + encodeURIComponent("Message body is required"));

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

  if (broadcastError) redirect("/broadcasts?error=" + encodeURIComponent(broadcastError.message));

  // Find all linked parents (unique) for this service
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("parent_user_id")
    .eq("educator_user_id", ownerUserId);

  if (!links || links.length === 0) {
    revalidatePath("/broadcasts");
    return;
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
}

export async function deleteBroadcast(id: string): Promise<void> {
  const supabase = await createClient();
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/onboarding");

  const myRole = await getMyStaffRole();
  if (myRole !== "director") redirect("/broadcasts?error=" + encodeURIComponent("Only the Director can delete broadcasts"));

  await supabase.from("broadcast_messages").delete().eq("id", id).eq("owner_user_id", ownerUserId);
  revalidatePath("/broadcasts");
}
