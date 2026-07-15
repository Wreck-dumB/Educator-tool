"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { Database } from "@/lib/types/database.types";

type ActivityCategory =
  Database["public"]["Tables"]["physical_activity_logs"]["Row"]["activity_category"];
type NutritionActivityType =
  Database["public"]["Tables"]["nutrition_education_logs"]["Row"]["activity_type"];
type GroupContext =
  Database["public"]["Tables"]["physical_activity_logs"]["Row"]["group_context"];

export async function logPhysicalActivity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const date = formData.get("date") as string;
  const activityCategory = formData.get("activity_category") as ActivityCategory;
  const movementSkillsRaw = formData.getAll("movement_skills") as string[];
  const durationMinutes = parseInt(formData.get("duration_minutes") as string, 10);
  const groupContext = (formData.get("group_context") as GroupContext) ?? "whole_group";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const childIds = formData.getAll("child_ids") as string[];

  if (!date || !activityCategory || isNaN(durationMinutes) || childIds.length === 0) return;

  await supabase.from("physical_activity_logs").insert(
    childIds.map((child_id) => ({
      owner_user_id: ownerUserId,
      child_id,
      date,
      activity_category: activityCategory,
      movement_skills: movementSkillsRaw,
      duration_minutes: durationMinutes,
      group_context: groupContext,
      notes,
    })),
  );

  revalidatePath("/physical-activity");
}

export async function logNutritionEducation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) return;

  const date = formData.get("date") as string;
  const activityType = formData.get("activity_type") as NutritionActivityType;
  const foodFocus = (formData.get("food_focus") as string)?.trim();
  const durationMinutes = parseInt(formData.get("duration_minutes") as string, 10);
  const groupContext = (formData.get("group_context") as GroupContext) ?? "whole_group";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const childIds = formData.getAll("child_ids") as string[];

  if (!date || !activityType || !foodFocus || isNaN(durationMinutes) || childIds.length === 0)
    return;

  await supabase.from("nutrition_education_logs").insert(
    childIds.map((child_id) => ({
      owner_user_id: ownerUserId,
      child_id,
      date,
      activity_type: activityType,
      food_focus: foodFocus,
      duration_minutes: durationMinutes,
      group_context: groupContext,
      notes,
    })),
  );

  revalidatePath("/physical-activity");
}

export async function deletePhysicalActivityLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return;

  await supabase.from("physical_activity_logs").delete().eq("id", id);
  revalidatePath("/physical-activity");
}

export async function deleteNutritionEducationLog(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return;

  await supabase.from("nutrition_education_logs").delete().eq("id", id);
  revalidatePath("/physical-activity");
}
