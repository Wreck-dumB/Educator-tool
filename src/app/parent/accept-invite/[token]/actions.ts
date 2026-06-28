"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptChildInvite(formData: FormData) {
  const supabase = await createClient();
  const token = formData.get("token") as string;

  const { error } = await supabase.rpc("accept_child_invite", { _token: token });

  if (error) {
    redirect(`/parent/accept-invite/${token}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/parent");
}
