import type { ProgramBlock } from "@/lib/types/domain";

// Mirrors the default in supabase/migrations/0060_program_blocks_status.sql —
// used client/server-side wherever a program's block list needs a fallback
// (e.g. before the row has loaded, or for a brand-new program object).
export const DEFAULT_PROGRAM_BLOCKS: ProgramBlock[] = [
  { key: "arrival", label: "Arrival & Free Play" },
  { key: "group_time", label: "Morning Group Time" },
  { key: "indoor_outdoor", label: "Indoor / Outdoor Play" },
  { key: "morning_tea", label: "Morning Tea" },
  { key: "lunch", label: "Lunch" },
  { key: "rest", label: "Rest / Quiet Time" },
  { key: "afternoon_tea", label: "Afternoon Tea" },
  { key: "home_time", label: "Home Time" },
];
