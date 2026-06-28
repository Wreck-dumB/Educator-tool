"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function parentSignup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = (formData.get("display_name") as string)?.trim();
  const next = (formData.get("next") as string) || "/parent";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!displayName) {
    redirect(`/parent/signup?error=Please enter your name&next=${encodeURIComponent(next)}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/parent/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  if (data.user) {
    // role is hardcoded server-side, never taken from client input -- this
    // is what prevents a client from ever picking role="educator" for itself.
    await supabase.from("profiles").insert({
      id: data.user.id,
      role: "parent",
      display_name: displayName,
    });
  }

  redirect("/parent/signup?message=Check your email to confirm your account, then log in.");
}
