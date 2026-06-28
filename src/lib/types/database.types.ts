// Hand-written types matching supabase/migrations/0001_initial_schema.sql.
// Once the Supabase project is set up, regenerate with:
//   npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.types.ts

export type EnergyLevel = "calm" | "moderate" | "high";
export type GroupSizeFit = "solo" | "small_group" | "whole_group";
export type GenerationMode = "materials" | "time" | "outcome" | "interest" | "surprise_me";
export type RiskLikelihood = "rare" | "unlikely" | "possible" | "likely" | "almost_certain";
export type RiskConsequence = "insignificant" | "minor" | "moderate" | "significant" | "major";
export type RiskRating = "low" | "medium" | "high" | "extreme";
export type MilestoneDomain = "gross_motor" | "fine_motor" | "language" | "social_emotional" | "cognitive";

export type CulturalDayConfidence = "high" | "approximate";

export interface CulturalDay {
  name: string;
  date: string;
  origin: string;
  note: string;
  confidence: CulturalDayConfidence;
}

export interface Hazard {
  hazard: string;
  who_could_be_harmed: string;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  risk_rating: RiskRating;
  control_measures: string[];
}

export interface Database {
  public: {
    Tables: {
      eylf_outcomes: {
        Row: {
          id: string;
          code: string;
          outcome_number: number;
          outcome_title: string;
          sub_outcome_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          outcome_number: number;
          outcome_title: string;
          sub_outcome_text: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["eylf_outcomes"]["Insert"]>;
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          owner_user_id: string;
          first_name: string;
          date_of_birth: string | null;
          current_interests: string | null;
          additional_needs: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          first_name: string;
          date_of_birth?: string | null;
          current_interests?: string | null;
          additional_needs?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["children"]["Insert"]>;
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Insert"]>;
        Relationships: [];
      };
      generated_activities: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          summary: string;
          steps: string[];
          materials_used: string[];
          reflection_prompts: string[];
          age_range: string | null;
          duration_minutes: number | null;
          energy_level: EnergyLevel | null;
          group_size_fit: GroupSizeFit | null;
          generation_mode: GenerationMode;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          summary: string;
          steps?: string[];
          materials_used?: string[];
          reflection_prompts?: string[];
          age_range?: string | null;
          duration_minutes?: number | null;
          energy_level?: EnergyLevel | null;
          group_size_fit?: GroupSizeFit | null;
          generation_mode: GenerationMode;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["generated_activities"]["Insert"]>;
        Relationships: [];
      };
      activity_eylf_links: {
        Row: {
          activity_id: string;
          eylf_outcome_id: string;
        };
        Insert: {
          activity_id: string;
          eylf_outcome_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_eylf_links"]["Insert"]>;
        Relationships: [];
      };
      observations: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          activity_id: string | null;
          note_text: string;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          activity_id?: string | null;
          note_text: string;
          observed_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["observations"]["Insert"]>;
        Relationships: [];
      };
      observation_eylf_links: {
        Row: {
          observation_id: string;
          eylf_outcome_id: string;
        };
        Insert: {
          observation_id: string;
          eylf_outcome_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["observation_eylf_links"]["Insert"]>;
        Relationships: [];
      };
      risk_assessments: {
        Row: {
          id: string;
          owner_user_id: string;
          activity_id: string | null;
          title: string;
          context_notes: string | null;
          hazards: Hazard[];
          involves_excursion: boolean;
          involves_sleep_rest: boolean;
          involves_water: boolean;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          activity_id?: string | null;
          title: string;
          context_notes?: string | null;
          hazards?: Hazard[];
          involves_excursion?: boolean;
          involves_sleep_rest?: boolean;
          involves_water?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["risk_assessments"]["Insert"]>;
        Relationships: [];
      };
      safe_work_procedures: {
        Row: {
          id: string;
          owner_user_id: string;
          task_title: string;
          task_description: string | null;
          ppe_required: string[];
          steps: string[];
          hazards: Hazard[];
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          task_title: string;
          task_description?: string | null;
          ppe_required?: string[];
          steps?: string[];
          hazards?: Hazard[];
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["safe_work_procedures"]["Insert"]>;
        Relationships: [];
      };
      policies: {
        Row: {
          id: string;
          owner_user_id: string;
          category: string;
          title: string;
          your_input: string;
          purpose: string | null;
          scope: string | null;
          procedure_steps: string[];
          related_legislation: string[];
          suggested_additions: string[];
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          category: string;
          title: string;
          your_input: string;
          purpose?: string | null;
          scope?: string | null;
          procedure_steps?: string[];
          related_legislation?: string[];
          suggested_additions?: string[];
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["policies"]["Insert"]>;
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          start_date: string;
          end_date: string;
          cultural_days: CulturalDay[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          start_date: string;
          end_date: string;
          cultural_days?: CulturalDay[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
        Relationships: [];
      };
      program_entries: {
        Row: {
          id: string;
          program_id: string;
          day_date: string;
          title: string;
          notes: string | null;
          activity_id: string | null;
          eylf_codes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          day_date: string;
          title: string;
          notes?: string | null;
          activity_id?: string | null;
          eylf_codes?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_entries"]["Insert"]>;
        Relationships: [];
      };
      developmental_milestones: {
        Row: {
          id: string;
          age_band: string;
          age_band_order: number;
          domain: MilestoneDomain;
          milestone_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          age_band: string;
          age_band_order: number;
          domain: MilestoneDomain;
          milestone_text: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["developmental_milestones"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
