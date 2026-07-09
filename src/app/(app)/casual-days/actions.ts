"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function respondToCasualDayRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const status = formData.get("status") as "approved" | "declined";
  const responseNote = (formData.get("response_note") as string)?.trim() || null;

  if (!id || !["approved", "declined"].includes(status)) redirect("/casual-days");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/casual-days?error=No+active+service+membership");

  const { error } = await supabase
    .from("casual_day_requests")
    .update({
      status,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
      response_note: responseNote,
    })
    .eq("id", id)
    .eq("educator_user_id", ownerUserId);

  if (error) redirect(`/casual-days?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/casual-days");
  redirect("/casual-days");
}
