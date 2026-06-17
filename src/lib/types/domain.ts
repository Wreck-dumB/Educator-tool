import type { Database } from "./database.types";

export type EylfOutcome = Database["public"]["Tables"]["eylf_outcomes"]["Row"];
export type ChildProfile = Database["public"]["Tables"]["children"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type GeneratedActivity = Database["public"]["Tables"]["generated_activities"]["Row"];
export type Observation = Database["public"]["Tables"]["observations"]["Row"];

/** A candidate activity returned by the generation engine, before it's saved. */
export interface ActivitySuggestion {
  title: string;
  summary: string;
  steps: string[];
  materialsUsed: string[];
  reflectionPrompts: string[];
  ageRange: string | null;
  durationMinutes: number | null;
  energyLevel: GeneratedActivity["energy_level"];
  groupSizeFit: GeneratedActivity["group_size_fit"];
  eylfCodes: string[];
}
