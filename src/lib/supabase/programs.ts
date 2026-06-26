import { createClient } from "@/lib/supabase/server";
import type { Program, ProgramEntry } from "@/lib/types/domain";

export interface ProgramWithEntries extends Program {
  entries: ProgramEntry[];
}

export async function getPrograms(): Promise<Program[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").order("start_date", { ascending: false });
  return data ?? [];
}

export async function getProgram(id: string): Promise<ProgramWithEntries | null> {
  const supabase = await createClient();
  const { data: program } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
  if (!program) return null;

  const { data: entries } = await supabase
    .from("program_entries")
    .select("*")
    .eq("program_id", id)
    .order("day_date");

  return { ...program, entries: entries ?? [] };
}
