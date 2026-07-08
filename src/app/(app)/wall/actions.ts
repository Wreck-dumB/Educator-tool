"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function postToWall(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = (formData.get("body") as string)?.trim();
  if (!body || body.length > 2000) {
    redirect("/wall?error=Post body is required (max 2000 characters)");
  }

  const educatorUserId = await getMyServiceOwnerId();
  if (!educatorUserId) redirect("/wall?error=No active service membership");

  const { error } = await supabase.from("wall_posts").insert({
    educator_user_id: educatorUserId,
    author_user_id: user.id,
    author_role: "educator",
    body,
    status: "approved",
    moderated_by: user.id,
    moderated_at: new Date().toISOString(),
  });

  if (error) redirect(`/wall?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/wall");
  redirect("/wall");
}

export async function approvePost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postId = formData.get("post_id") as string;
  if (!postId) redirect("/wall");

  await supabase
    .from("wall_posts")
    .update({ status: "approved", moderated_by: user.id, moderated_at: new Date().toISOString() })
    .eq("id", postId);

  revalidatePath("/wall");
  redirect("/wall");
}

export async function rejectPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postId = formData.get("post_id") as string;
  const reason = (formData.get("reason") as string)?.trim() || null;
  if (!postId) redirect("/wall");

  await supabase
    .from("wall_posts")
    .update({
      status: "rejected",
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", postId);

  revalidatePath("/wall");
  redirect("/wall");
}

export async function deletePost(formData: FormData) {
  const supabase = await createClient();
  const postId = formData.get("post_id") as string;
  if (!postId) redirect("/wall");
  await supabase.from("wall_posts").delete().eq("id", postId);
  revalidatePath("/wall");
  redirect("/wall");
}
