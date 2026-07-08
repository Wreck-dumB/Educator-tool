"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessageFromParent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversationId = formData.get("conversation_id") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!conversationId || !body || body.length > 4000) {
    redirect(`/parent/messages/${conversationId}?error=Message is required (max 4000 characters)`);
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_user_id: user.id,
    body,
  });

  if (error) {
    redirect(`/parent/messages/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/parent/messages/${conversationId}`);
  redirect(`/parent/messages/${conversationId}`);
}
