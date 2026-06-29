import { createClient } from "@/lib/supabase/server";
import type { FormTemplate } from "@/lib/types/domain";

export async function getFormTemplates(): Promise<FormTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("form_templates").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getFormTemplate(id: string): Promise<FormTemplate | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("form_templates").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
