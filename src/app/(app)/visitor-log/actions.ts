"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { VisitorType } from "@/lib/types/database.types";

export async function signInVisitor(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) redirect("/staff/onboard");

  const visitorName = formData.get("visitor_name") as string;
  const visitorType = formData.get("visitor_type") as VisitorType;
  const organisation = (formData.get("organisation") as string) || null;
  const purposeOfVisit = formData.get("purpose_of_visit") as string;
  const idChecked = formData.get("id_checked") === "yes";
  const wwccChecked = formData.get("wwcc_checked") === "yes";
  const wwccNumber = (formData.get("wwcc_number") as string) || null;
  const supervised = formData.get("supervised") !== "no";
  const notes = (formData.get("notes") as string) || null;

  if (!visitorName || !visitorType || !purposeOfVisit) {
    redirect("/visitor-log?error=Name%2C+type+and+purpose+are+required");
  }

  const { error } = await supabase.from("visitor_log").insert({
    owner_user_id: ownerUserId,
    visitor_name: visitorName,
    visitor_type: visitorType,
    organisation,
    purpose_of_visit: purposeOfVisit,
    signed_in_at: new Date().toISOString(),
    id_checked: idChecked,
    wwcc_checked: wwccChecked,
    wwcc_number: wwccNumber,
    supervised,
    signed_in_by_user_id: user.id,
    notes,
  });

  if (error) redirect(`/visitor-log?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/visitor-log");
  redirect("/visitor-log");
}

export async function signOutVisitor(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("visitor_log")
    .update({ signed_out_at: new Date().toISOString() })
    .eq("id", id)
    .is("signed_out_at", null);

  revalidatePath("/visitor-log");
}

export async function deleteVisitorLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("visitor_log").delete().eq("id", id);
  revalidatePath("/visitor-log");
}
