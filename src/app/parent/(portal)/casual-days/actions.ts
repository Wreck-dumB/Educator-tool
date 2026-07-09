"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitCasualDayRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const requestedDate = formData.get("requested_date") as string;
  const sessionType = (formData.get("session_type") as string) || "full_day";
  const notes = (formData.get("notes") as string)?.trim() || null;

  const { error } = await supabase.rpc("submit_casual_day_request", {
    _child_id: childId,
    _requested_date: requestedDate,
    _session_type: sessionType,
    _notes: notes,
  });

  if (error) redirect(`/parent/casual-days?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/parent/casual-days");
  redirect("/parent/casual-days?sent=1");
}
