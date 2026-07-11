"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptTerms() {
  const supabase = await createClient();
  await supabase.rpc("accept_terms", { _version: "1.0" });
  redirect("/dashboard");
}
