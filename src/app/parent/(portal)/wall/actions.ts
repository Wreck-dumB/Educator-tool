"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitWallPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = (formData.get("body") as string)?.trim();
  const educatorUserId = formData.get("educator_user_id") as string;

  if (!body || body.length > 2000 || !educatorUserId) {
    redirect("/parent/wall?error=Post body is required (max 2000 characters)");
  }

  const { error } = await supabase.from("wall_posts").insert({
    educator_user_id: educatorUserId,
    author_user_id: user.id,
    author_role: "parent",
    body,
    status: "pending",
  });

  if (error) redirect(`/parent/wall?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/parent/wall");
  redirect("/parent/wall?message=Post submitted for review");
}

export async function deleteOwnPendingPost(formData: FormData) {
  const supabase = await createClient();
  const postId = formData.get("post_id") as string;
  if (!postId) redirect("/parent/wall");
  await supabase.from("wall_posts").delete().eq("id", postId);
  revalidatePath("/parent/wall");
  redirect("/parent/wall");
}
