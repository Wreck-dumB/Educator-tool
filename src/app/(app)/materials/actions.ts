"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyServiceOwnerId } from "@/lib/supabase/services";
import type { MaterialCategory } from "@/lib/types/database.types";

export async function addMaterial(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as MaterialCategory) || "classroom";
  const quantityRaw = formData.get("quantity") as string;
  const unit = (formData.get("unit") as string)?.trim() || null;
  const thresholdRaw = formData.get("low_stock_threshold") as string;

  if (!name) {
    redirect(`/materials?error=Please enter a material name`);
  }

  const ownerUserId = await getMyServiceOwnerId();
  if (!ownerUserId) {
    redirect("/materials?error=No active service membership");
  }

  const { error } = await supabase.from("materials").insert({
    owner_user_id: ownerUserId,
    name,
    category,
    quantity: quantityRaw ? Number(quantityRaw) : null,
    unit,
    low_stock_threshold: thresholdRaw ? Number(thresholdRaw) : null,
  });

  if (error) {
    redirect(`/materials?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/materials");
  redirect("/materials");
}

export async function deleteMaterial(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("materials").delete().eq("id", id);

  revalidatePath("/materials");
  redirect("/materials");
}

export async function updateMaterialStock(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const quantityRaw = formData.get("quantity") as string;
  const thresholdRaw = formData.get("low_stock_threshold") as string;
  const unit = (formData.get("unit") as string)?.trim() || null;

  await supabase
    .from("materials")
    .update({
      quantity: quantityRaw ? Number(quantityRaw) : null,
      low_stock_threshold: thresholdRaw ? Number(thresholdRaw) : null,
      unit,
    })
    .eq("id", id);

  revalidatePath("/materials");
  redirect("/materials");
}
