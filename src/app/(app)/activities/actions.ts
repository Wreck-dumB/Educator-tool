"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function archiveActivity(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("generated_activities").update({ is_archived: true }).eq("id", id);
  revalidatePath("/activities");
  revalidatePath(`/activities/${id}`);
}

export async function unarchiveActivity(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("generated_activities").update({ is_archived: false }).eq("id", id);
  revalidatePath("/activities");
  revalidatePath(`/activities/${id}`);
}

export async function deleteActivity(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  await supabase.from("generated_activities").delete().eq("id", id);
  redirect("/activities");
}
