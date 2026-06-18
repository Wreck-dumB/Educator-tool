"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addMaterial(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    redirect("/materials?error=Please enter a material name");
  }

  const { error } = await supabase.from("materials").insert({
    owner_user_id: user.id,
    name,
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
