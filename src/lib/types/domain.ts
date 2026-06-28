import type { Database } from "./database.types";

export type EylfOutcome = Database["public"]["Tables"]["eylf_outcomes"]["Row"];
export type ChildProfile = Database["public"]["Tables"]["children"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type GeneratedActivity = Database["public"]["Tables"]["generated_activities"]["Row"];
export type Observation = Database["public"]["Tables"]["observations"]["Row"];
export type RiskAssessment = Database["public"]["Tables"]["risk_assessments"]["Row"];
export type SafeWorkProcedure = Database["public"]["Tables"]["safe_work_procedures"]["Row"];
export type Policy = Database["public"]["Tables"]["policies"]["Row"];
export type Program = Database["public"]["Tables"]["programs"]["Row"];
export type ProgramEntry = Database["public"]["Tables"]["program_entries"]["Row"];
export type DevelopmentalMilestone = Database["public"]["Tables"]["developmental_milestones"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ChildInvite = Database["public"]["Tables"]["child_invites"]["Row"];
export type ParentChildLink = Database["public"]["Tables"]["parent_child_links"]["Row"];

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

/** A candidate risk assessment returned by the generation engine, before it's saved. */
export interface RiskAssessmentSuggestion {
  contextNotes: string | null;
  hazards: import("./database.types").Hazard[];
  involvesExcursion: boolean;
  involvesSleepRest: boolean;
  involvesWater: boolean;
}

/** A candidate safe work procedure returned by the generation engine, before it's saved. */
export interface SafeWorkProcedureSuggestion {
  ppeRequired: string[];
  steps: string[];
  hazards: import("./database.types").Hazard[];
}

/** A candidate policy draft returned by the generation engine, before it's saved. */
export interface PolicySuggestion {
  title: string;
  purpose: string | null;
  scope: string | null;
  procedureSteps: string[];
  relatedLegislation: string[];
  suggestedAdditions: string[];
}

/** One EYLF outcome's recent coverage, used to drive the program planner's gap view. */
export interface OutcomeCoverage {
  code: string;
  outcomeNumber: number;
  outcomeTitle: string;
  subOutcomeText: string;
  timesCovered: number;
  lastCoveredAt: string | null;
}

/** A candidate program entry returned by the generation engine, before it's saved. */
export interface ProgramEntrySuggestion {
  dayDate: string;
  title: string;
  notes: string | null;
  eylfCodes: string[];
  activityId: string | null;
}

/** A candidate program returned by the generation engine, before it's saved. */
export interface ProgramSuggestion {
  entries: ProgramEntrySuggestion[];
  culturalDays: import("./database.types").CulturalDay[];
}
