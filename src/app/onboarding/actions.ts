"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startNewService(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim() || "My Service";

  const { error } = await supabase.rpc("start_new_service", { _name: name });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/generate");
}

export async function acceptStaffInvite(formData: FormData) {
  const supabase = await createClient();
  const token = formData.get("token") as string;

  const { error } = await supabase.rpc("accept_staff_invite", { _token: token });

  if (error) {
    redirect(`/onboarding/accept-invite/${token}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/generate");
}
