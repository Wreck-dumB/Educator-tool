"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitAbsence(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const absenceDate = formData.get("absence_date") as string;
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!childId || !absenceDate) {
    redirect("/parent/absences?error=Missing+required+fields");
  }

  const { error } = await supabase.rpc("submit_absence_notification", {
    _child_id: childId,
    _absence_date: absenceDate,
    _reason: reason,
  });

  if (error) {
    redirect(`/parent/absences?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/parent/absences");
  redirect("/parent/absences?sent=1");
}
