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

/**
 * Distinct entry titles from this owner's most recent programs — fed into
 * AI drafting so it can favor variety instead of repeating the same
 * activities week after week (soft steering, not a hard exclusion).
 */
export async function getRecentProgramEntryTitles(recentProgramCount = 3, titleCap = 40): Promise<string[]> {
  const supabase = await createClient();
  const { data: recentPrograms } = await supabase
    .from("programs")
    .select("id")
    .order("start_date", { ascending: false })
    .limit(recentProgramCount);

  const programIds = (recentPrograms ?? []).map((p) => p.id);
  if (programIds.length === 0) return [];

  const { data: entries } = await supabase
    .from("program_entries")
    .select("title")
    .in("program_id", programIds);

  const titles = [...new Set((entries ?? []).map((e) => e.title))];
  return titles.slice(0, titleCap);
}
