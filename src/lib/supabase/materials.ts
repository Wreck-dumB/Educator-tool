import { createClient } from "@/lib/supabase/server";
import type { Material } from "@/lib/types/domain";

export async function getMaterials(): Promise<Material[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("*").order("name");
  return data ?? [];
}
