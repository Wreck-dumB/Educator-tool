"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";

export async function createChild(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const firstName = (formData.get("first_name") as string)?.trim();
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const currentInterests = (formData.get("current_interests") as string)?.trim() || null;
  const additionalNeeds = (formData.get("additional_needs") as string)?.trim() || null;

  if (!firstName) {
    redirect("/children?error=Please enter a first name");
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect("/children?error=No active service membership");
  }

  const { error } = await supabase.from("children").insert({
    owner_user_id: ownerUserId,
    first_name: firstName,
    date_of_birth: dateOfBirth,
    current_interests: currentInterests,
    additional_needs: additionalNeeds,
  });

  if (error) {
    redirect(`/children?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/children");
  redirect("/children");
}

export async function updateChild(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const firstName = (formData.get("first_name") as string)?.trim();
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const currentInterests = (formData.get("current_interests") as string)?.trim() || null;
  const additionalNeeds = (formData.get("additional_needs") as string)?.trim() || null;

  if (!firstName) {
    redirect(`/children/${id}?error=Please enter a first name`);
  }

  const { error } = await supabase
    .from("children")
    .update({
      first_name: firstName,
      date_of_birth: dateOfBirth,
      current_interests: currentInterests,
      additional_needs: additionalNeeds,
    })
    .eq("id", id);

  if (error) {
    redirect(`/children/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
  redirect(`/children/${id}`);
}

export async function deleteChild(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("children").delete().eq("id", id);

  revalidatePath("/children");
  redirect("/children");
}

export async function createChildInvite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const invitedEmail = (formData.get("invited_email") as string)?.trim();

  if (!invitedEmail) {
    redirect(`/children/${childId}?error=Please enter the family's email`);
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect(`/children/${childId}?error=No active service membership`);
  }

  // RLS re-checks ownership of childId server-side -- a forged child_id for
  // someone else's child simply fails to insert (zero rows affected), not
  // a leak. educator_user_id is always the Director's id (the service's
  // identity for the parent-trust model), never the acting staff member's.
  const { error } = await supabase.from("child_invites").insert({
    child_id: childId,
    educator_user_id: ownerUserId,
    invited_email: invitedEmail,
  });

  if (error) {
    redirect(`/children/${childId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

export async function revokeChildInvite(formData: FormData) {
  const supabase = await createClient();
  const inviteId = formData.get("invite_id") as string;
  const childId = formData.get("child_id") as string;

  await supabase.from("child_invites").update({ status: "revoked" }).eq("id", inviteId);

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

export async function updateChildEnrolment(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  const field = (name: string) => (formData.get(name) as string)?.trim() || null;

  const { error } = await supabase
    .from("children")
    .update({
      address: field("address"),
      medical_practice_name: field("medical_practice_name"),
      medical_practice_phone: field("medical_practice_phone"),
      medicare_number: field("medicare_number"),
      medical_conditions: field("medical_conditions"),
      is_anaphylaxis_risk: formData.get("is_anaphylaxis_risk") === "on",
      medical_management_plan: field("medical_management_plan"),
      dietary_restrictions: field("dietary_restrictions"),
      immunisation_status: field("immunisation_status"),
    })
    .eq("id", id);

  if (error) {
    redirect(`/children/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/children/${id}`);
  redirect(`/children/${id}`);
}

export async function createChildContact(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const fullName = (formData.get("full_name") as string)?.trim();

  if (!fullName) {
    redirect(`/children/${childId}?error=Please enter the contact's name`);
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect(`/children/${childId}?error=No active service membership`);
  }

  const { error } = await supabase.from("child_contacts").insert({
    child_id: childId,
    owner_user_id: ownerUserId,
    full_name: fullName,
    relationship: (formData.get("relationship") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    is_parent_guardian: formData.get("is_parent_guardian") === "on",
    is_emergency_contact: formData.get("is_emergency_contact") === "on",
    is_authorised_nominee: formData.get("is_authorised_nominee") === "on",
    can_consent_medical_treatment: formData.get("can_consent_medical_treatment") === "on",
    can_authorise_medication: formData.get("can_authorise_medication") === "on",
    can_authorise_excursions: formData.get("can_authorise_excursions") === "on",
  });

  if (error) {
    redirect(`/children/${childId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

export async function setAttendanceDays(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId || !childId) redirect(`/children/${childId}`);

  // day_0 through day_4 — value is session_type or empty string (= not enrolled that day)
  const days: { day_of_week: number; session_type: string }[] = [];
  for (let d = 0; d <= 4; d++) {
    const val = (formData.get(`day_${d}`) as string) || "";
    if (val) days.push({ day_of_week: d, session_type: val });
  }

  // Replace all existing days for this child
  await supabase.from("child_attendance_days").delete().eq("child_id", childId);
  if (days.length > 0) {
    await supabase.from("child_attendance_days").insert(
      days.map((d) => ({
        child_id: childId,
        owner_user_id: ownerUserId,
        day_of_week: d.day_of_week,
        session_type: d.session_type as "full_day" | "morning" | "afternoon",
      })),
    );
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath("/day-plan");
  redirect(`/children/${childId}?saved=1`);
}

export async function updateChildInterests(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = formData.get("child_id") as string;
  const interests = (formData.get("interests") as string)?.trim() || null;
  const returnTo = (formData.get("return_to") as string) || "/observations";

  await supabase.from("children").update({ current_interests: interests }).eq("id", childId);

  revalidatePath(`/children/${childId}`);
  redirect(returnTo);
}

export async function deleteChildContact(formData: FormData) {
  const supabase = await createClient();
  const contactId = formData.get("contact_id") as string;
  const childId = formData.get("child_id") as string;

  await supabase.from("child_contacts").delete().eq("id", contactId);

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}
