"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function createRoom(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  if (!name) redirect("/rooms?error=Please enter a room name");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/rooms?error=No active service membership");

  const { count } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("rooms").insert({
    owner_user_id: ownerUserId,
    name,
    sort_order: count ?? 0,
  });

  if (error) redirect(`/rooms?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/rooms");
  revalidatePath("/attendance");
  redirect("/rooms");
}

export async function renameRoom(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) redirect("/rooms?error=Please enter a room name");

  await supabase.from("rooms").update({ name }).eq("id", id);

  revalidatePath("/rooms");
  revalidatePath("/attendance");
  redirect("/rooms");
}

export async function deleteRoom(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  // Unassign children from this room first
  await supabase.from("children").update({ room_id: null }).eq("room_id", id);
  await supabase.from("rooms").delete().eq("id", id);

  revalidatePath("/rooms");
  revalidatePath("/attendance");
  revalidatePath("/children");
  redirect("/rooms");
}

export async function assignChildToRoom(formData: FormData) {
  const supabase = await createClient();
  const childId = formData.get("child_id") as string;
  const roomId = (formData.get("room_id") as string) || null;

  await supabase.from("children").update({ room_id: roomId }).eq("id", childId);

  revalidatePath("/rooms");
  revalidatePath("/attendance");
  revalidatePath("/children");
}
