// Hand-written types matching supabase/migrations/0001_initial_schema.sql.
// Once the Supabase project is set up, regenerate with:
//   npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.types.ts

export type EnergyLevel = "calm" | "moderate" | "high";
export type GroupSizeFit = "solo" | "small_group" | "whole_group";
export type GenerationMode = "materials" | "time" | "outcome" | "interest" | "surprise_me";

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
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          first_name: string;
          date_of_birth?: string | null;
          current_interests?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
