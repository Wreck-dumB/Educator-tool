// Hand-written types matching supabase/migrations/0001_initial_schema.sql.
// Once the Supabase project is set up, regenerate with:
//   npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.types.ts

export type EnergyLevel = "calm" | "moderate" | "high";
export type GroupSizeFit = "solo" | "small_group" | "whole_group";
export type GenerationMode = "materials" | "time" | "outcome" | "interest" | "surprise_me";
export type RiskLikelihood = "rare" | "unlikely" | "possible" | "likely" | "almost_certain";
export type RiskConsequence = "insignificant" | "minor" | "moderate" | "significant" | "major";
export type RiskRating = "low" | "medium" | "high" | "extreme";
export type MilestoneDomain = "gross_motor" | "fine_motor" | "language" | "social_emotional" | "cognitive" | "physical";
export type ProfileRole = "educator" | "parent";
export type ChildInviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type QipItemType = "strength" | "improvement";
export type QipItemPriority = "low" | "medium" | "high";
export type QipItemStatus = "not_started" | "in_progress" | "achieved";
export type IncidentRecordType = "incident" | "injury" | "trauma" | "illness";
export type PermissionSlipType = "excursion_consent" | "photo_media_consent" | "medication_authorisation" | "other";
export type PermissionSlipStatus = "draft" | "sent" | "closed";
export type MaterialCategory = "classroom" | "food";
export type WaitingListStatus = "enquiry" | "waitlisted" | "offered" | "enrolled" | "declined" | "withdrawn";
export interface RoutineBlock {
  id: string;
  time: string;
  title: string;
  duration_minutes: number;
  notes?: string;
  activity_id?: string | null;
  type: "routine" | "activity" | "meal" | "rest" | "outdoor" | "transition";
}
export interface QipCheckinResponse {
  qa: number;
  question: string;
  answer: "yes" | "mostly" | "no";
  notes: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type SessionPreference = "full_day" | "morning" | "afternoon" | "flexible";
export type StaffRole = "director" | "2ic" | "staff";
export type StaffMembershipStatus = "active" | "removed";
export type StaffInviteRole = "2ic" | "staff";
export type StaffInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type AttendanceStatus = "absent" | "signed_in" | "signed_out";
export type RatioTier = "under_2" | "2_to_3" | "3_to_6" | "school_age" | "unknown";

export type PosterTheme = "coral" | "sage" | "amber" | "ink" | "plain";
export type PosterImageSource = "upload" | "stock";

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
          address: string | null;
          medical_practice_name: string | null;
          medical_practice_phone: string | null;
          medicare_number: string | null;
          medical_conditions: string | null;
          is_anaphylaxis_risk: boolean;
          medical_management_plan: string | null;
          dietary_restrictions: string | null;
          immunisation_status: string | null;
          room_id: string | null;
          enrolment_ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          first_name: string;
          date_of_birth?: string | null;
          current_interests?: string | null;
          additional_needs?: string | null;
          address?: string | null;
          medical_practice_name?: string | null;
          medical_practice_phone?: string | null;
          medicare_number?: string | null;
          medical_conditions?: string | null;
          is_anaphylaxis_risk?: boolean;
          medical_management_plan?: string | null;
          dietary_restrictions?: string | null;
          immunisation_status?: string | null;
          room_id?: string | null;
          enrolment_ended_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["children"]["Insert"]>;
        Relationships: [];
      };
      wall_posts: {
        Row: {
          id: string;
          educator_user_id: string;
          author_user_id: string;
          author_role: "educator" | "parent";
          body: string;
          status: "pending" | "approved" | "rejected";
          moderated_by: string | null;
          moderated_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          educator_user_id: string;
          author_user_id: string;
          author_role: "educator" | "parent";
          body: string;
          status?: "pending" | "approved" | "rejected";
          moderated_by?: string | null;
          moderated_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wall_posts"]["Insert"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          parent_child_link_id: string;
          educator_user_id: string;
          parent_user_id: string;
          child_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_child_link_id: string;
          educator_user_id: string;
          parent_user_id: string;
          child_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_user_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_user_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          sort_order: number;
          capacity: number | null;
          min_age_months: number | null;
          max_age_months: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          sort_order?: number;
          capacity?: number | null;
          min_age_months?: number | null;
          max_age_months?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rooms"]["Insert"]>;
        Relationships: [];
      };
      room_staff_counts: {
        Row: {
          id: string;
          owner_user_id: string;
          room_id: string;
          date: string;
          staff_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          room_id: string;
          date: string;
          staff_count: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["room_staff_counts"]["Insert"]>;
        Relationships: [];
      };
      child_contacts: {
        Row: {
          id: string;
          child_id: string;
          owner_user_id: string;
          full_name: string;
          relationship: string | null;
          phone: string | null;
          email: string | null;
          is_parent_guardian: boolean;
          is_emergency_contact: boolean;
          is_authorised_nominee: boolean;
          can_consent_medical_treatment: boolean;
          can_authorise_medication: boolean;
          can_authorise_excursions: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          owner_user_id: string;
          full_name: string;
          relationship?: string | null;
          phone?: string | null;
          email?: string | null;
          is_parent_guardian?: boolean;
          is_emergency_contact?: boolean;
          is_authorised_nominee?: boolean;
          can_consent_medical_treatment?: boolean;
          can_authorise_medication?: boolean;
          can_authorise_excursions?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["child_contacts"]["Insert"]>;
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          category: MaterialCategory;
          quantity: number | null;
          unit: string | null;
          low_stock_threshold: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          category?: MaterialCategory;
          quantity?: number | null;
          unit?: string | null;
          low_stock_threshold?: number | null;
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
          is_archived: boolean;
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
          is_archived?: boolean;
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
          photo_url: string | null;
          observed_at: string;
          created_at: string;
          shared_with_parent_at: string | null;
          shared_by: string | null;
          observation_type: string;
          observation_title: string | null;
          observation_context: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          activity_id?: string | null;
          note_text: string;
          photo_url?: string | null;
          observed_at?: string;
          created_at?: string;
          shared_with_parent_at?: string | null;
          shared_by?: string | null;
          observation_type?: string;
          observation_title?: string | null;
          observation_context?: string | null;
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
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          role: ProfileRole;
          display_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      child_invites: {
        Row: {
          id: string;
          child_id: string;
          educator_user_id: string;
          invited_email: string;
          token: string;
          status: ChildInviteStatus;
          created_at: string;
          expires_at: string;
          accepted_by: string | null;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          educator_user_id: string;
          invited_email: string;
          token?: string;
          status?: ChildInviteStatus;
          created_at?: string;
          expires_at?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["child_invites"]["Insert"]>;
        Relationships: [];
      };
      parent_child_links: {
        Row: {
          id: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          created_via_invite_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          created_via_invite_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_child_links"]["Insert"]>;
        Relationships: [];
      };
      nqs_standards: {
        Row: {
          id: string;
          code: string;
          quality_area_number: number;
          quality_area_title: string;
          standard_title: string;
          standard_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          quality_area_number: number;
          quality_area_title: string;
          standard_title: string;
          standard_text: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["nqs_standards"]["Insert"]>;
        Relationships: [];
      };
      quality_improvement_plans: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          context_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title?: string;
          context_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quality_improvement_plans"]["Insert"]>;
        Relationships: [];
      };
      qip_items: {
        Row: {
          id: string;
          qip_id: string;
          owner_user_id: string;
          quality_area_number: number;
          standard_code: string | null;
          item_type: QipItemType;
          description: string;
          priority: QipItemPriority | null;
          success_measure: string | null;
          steps: string[];
          timeframe: string | null;
          status: QipItemStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          qip_id: string;
          owner_user_id: string;
          quality_area_number: number;
          standard_code?: string | null;
          item_type: QipItemType;
          description: string;
          priority?: QipItemPriority | null;
          success_measure?: string | null;
          steps?: string[];
          timeframe?: string | null;
          status?: QipItemStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["qip_items"]["Insert"]>;
        Relationships: [];
      };
      form_templates: {
        Row: {
          id: string;
          owner_user_id: string;
          category: string;
          title: string;
          your_input: string;
          purpose: string | null;
          fields_to_complete: string[];
          body_text: string | null;
          requires_signature: boolean;
          suggested_additions: string[];
          is_finalised: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          category: string;
          title: string;
          your_input: string;
          purpose?: string | null;
          fields_to_complete?: string[];
          body_text?: string | null;
          requires_signature?: boolean;
          suggested_additions?: string[];
          is_finalised?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["form_templates"]["Insert"]>;
        Relationships: [];
      };
      child_incident_reports: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          record_type: IncidentRecordType;
          occurred_at: string;
          location: string | null;
          description: string;
          action_taken: string | null;
          parent_notified_at: string | null;
          parent_notification_method: string | null;
          nominated_supervisor_notified: boolean;
          monitoring_plan: string | null;
          witness_name: string | null;
          completed_by_name: string;
          completed_by_role: string | null;
          created_by_user_id: string | null;
          possible_harm_indicator: boolean;
          mandatory_report_made: boolean | null;
          mandatory_report_at: string | null;
          mandatory_report_by: string | null;
          regulatory_authority_notified: boolean;
          regulatory_authority_notified_at: string | null;
          regulatory_authority_notification_method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          record_type: IncidentRecordType;
          occurred_at: string;
          location?: string | null;
          description: string;
          action_taken?: string | null;
          parent_notified_at?: string | null;
          parent_notification_method?: string | null;
          nominated_supervisor_notified?: boolean;
          monitoring_plan?: string | null;
          witness_name?: string | null;
          completed_by_name: string;
          completed_by_role?: string | null;
          created_by_user_id?: string | null;
          possible_harm_indicator?: boolean;
          mandatory_report_made?: boolean | null;
          mandatory_report_at?: string | null;
          mandatory_report_by?: string | null;
          regulatory_authority_notified?: boolean;
          regulatory_authority_notified_at?: string | null;
          regulatory_authority_notification_method?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["child_incident_reports"]["Insert"]>;
        Relationships: [];
      };
      staff_incident_reports: {
        Row: {
          id: string;
          owner_user_id: string;
          staff_name: string;
          staff_role: string | null;
          occurred_at: string;
          location: string | null;
          description: string;
          injury_description: string | null;
          first_aid_provided: boolean;
          medical_treatment_sought: boolean;
          is_potentially_notifiable: boolean;
          witness_name: string | null;
          immediate_actions: string | null;
          corrective_actions: string | null;
          completed_by_name: string;
          completed_by_role: string | null;
          created_by_user_id: string | null;
          subject_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          staff_name: string;
          staff_role?: string | null;
          occurred_at: string;
          location?: string | null;
          description: string;
          injury_description?: string | null;
          first_aid_provided?: boolean;
          medical_treatment_sought?: boolean;
          is_potentially_notifiable?: boolean;
          witness_name?: string | null;
          immediate_actions?: string | null;
          corrective_actions?: string | null;
          completed_by_name: string;
          completed_by_role?: string | null;
          created_by_user_id?: string | null;
          subject_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_incident_reports"]["Insert"]>;
        Relationships: [];
      };
      permission_slips: {
        Row: {
          id: string;
          educator_user_id: string;
          created_by_user_id: string | null;
          slip_type: PermissionSlipType;
          title: string;
          current_version: number;
          status: PermissionSlipStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          educator_user_id: string;
          created_by_user_id?: string | null;
          slip_type: PermissionSlipType;
          title: string;
          current_version?: number;
          status?: PermissionSlipStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permission_slips"]["Insert"]>;
        Relationships: [];
      };
      permission_slip_versions: {
        Row: {
          id: string;
          slip_id: string;
          version_number: number;
          body_text: string;
          requires_high_stakes_ack: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slip_id: string;
          version_number: number;
          body_text: string;
          requires_high_stakes_ack?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permission_slip_versions"]["Insert"]>;
        Relationships: [];
      };
      permission_slip_targets: {
        Row: {
          id: string;
          slip_id: string;
          child_id: string;
          sent_version_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slip_id: string;
          child_id: string;
          sent_version_number: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permission_slip_targets"]["Insert"]>;
        Relationships: [];
      };
      permission_slip_signatures: {
        Row: {
          id: string;
          slip_id: string;
          child_id: string;
          version_id: string;
          signed_by: string;
          signer_typed_name: string;
          affirmed: boolean;
          signed_at: string;
        };
        Insert: {
          id?: string;
          slip_id: string;
          child_id: string;
          version_id: string;
          signed_by: string;
          signer_typed_name: string;
          affirmed: boolean;
          signed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permission_slip_signatures"]["Insert"]>;
        Relationships: [];
      };
      posters: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          subtitle: string | null;
          body_text: string | null;
          footer_text: string | null;
          theme: PosterTheme;
          image_source: PosterImageSource | null;
          image_path: string | null;
          image_url: string | null;
          image_credit: string | null;
          canvas_json: object | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          subtitle?: string | null;
          body_text?: string | null;
          footer_text?: string | null;
          theme?: PosterTheme;
          image_source?: PosterImageSource | null;
          image_path?: string | null;
          image_url?: string | null;
          image_credit?: string | null;
          canvas_json?: object | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posters"]["Insert"]>;
        Relationships: [];
      };
      staff_attendance: {
        Row: {
          id: string;
          owner_user_id: string;
          user_id: string;
          date: string;
          signed_in_at: string;
          signed_out_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          user_id: string;
          date?: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_attendance"]["Insert"]>;
        Relationships: [];
      };
      visitors: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          company: string | null;
          reason: string;
          signed_in_at: string;
          signed_out_at: string | null;
          signed_in_by: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          company?: string | null;
          reason: string;
          signed_in_at?: string;
          signed_out_at?: string | null;
          signed_in_by?: string | null;
          date?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visitors"]["Insert"]>;
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          description: string | null;
          ingredients: string[];
          steps: string[];
          prep_time_minutes: number | null;
          servings: number | null;
          age_range: string | null;
          dietary_tags: string[];
          allergens_present: string[];
          choking_hazard_notes: string | null;
          your_input: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          description?: string | null;
          ingredients?: string[];
          steps?: string[];
          prep_time_minutes?: number | null;
          servings?: number | null;
          age_range?: string | null;
          dietary_tags?: string[];
          allergens_present?: string[];
          choking_hazard_notes?: string | null;
          your_input: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          director_user_id: string;
          name: string;
          display_name: string | null;
          logo_path: string | null;
          preferred_observation_types: string[];
          privacy_policy_url: string | null;
          ai_data_notice_accepted_at: string | null;
          ai_data_notice_accepted_by: string | null;
          approved_provider_number: string | null;
          service_approval_number: string | null;
          nominated_supervisor_name: string | null;
          nominated_supervisor_phone: string | null;
          nominated_supervisor_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          director_user_id: string;
          name?: string;
          display_name?: string | null;
          logo_path?: string | null;
          preferred_observation_types?: string[];
          privacy_policy_url?: string | null;
          ai_data_notice_accepted_at?: string | null;
          ai_data_notice_accepted_by?: string | null;
          approved_provider_number?: string | null;
          service_approval_number?: string | null;
          nominated_supervisor_name?: string | null;
          nominated_supervisor_phone?: string | null;
          nominated_supervisor_email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      complaint_records: {
        Row: {
          id: string;
          owner_user_id: string;
          received_at: string;
          complainant_type: "parent" | "staff" | "child" | "community" | "anonymous" | "regulatory_body";
          subject: string;
          description: string;
          status: "received" | "acknowledged" | "under_review" | "resolved" | "escalated";
          resolution_notes: string | null;
          resolved_at: string | null;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          received_at?: string;
          complainant_type?: "parent" | "staff" | "child" | "community" | "anonymous" | "regulatory_body";
          subject: string;
          description: string;
          status?: "received" | "acknowledged" | "under_review" | "resolved" | "escalated";
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["complaint_records"]["Insert"]>;
        Relationships: [];
      };
      environment_safety_checks: {
        Row: {
          id: string;
          owner_user_id: string;
          check_date: string;
          room_id: string | null;
          items: Record<string, boolean>;
          notes: string | null;
          completed_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          check_date: string;
          room_id?: string | null;
          items: Record<string, boolean>;
          notes?: string | null;
          completed_by_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["environment_safety_checks"]["Insert"]>;
        Relationships: [];
      };
      staff_memberships: {
        Row: {
          id: string;
          service_id: string;
          user_id: string;
          role: StaffRole;
          status: StaffMembershipStatus;
          invited_by: string | null;
          created_at: string;
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          user_id: string;
          role: StaffRole;
          status?: StaffMembershipStatus;
          invited_by?: string | null;
          created_at?: string;
          removed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["staff_memberships"]["Insert"]>;
        Relationships: [];
      };
      staff_invites: {
        Row: {
          id: string;
          service_id: string;
          invited_role: StaffInviteRole;
          invited_email: string;
          token: string;
          status: StaffInviteStatus;
          invited_by: string;
          created_at: string;
          expires_at: string;
          accepted_by: string | null;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          invited_role: StaffInviteRole;
          invited_email: string;
          token?: string;
          status?: StaffInviteStatus;
          invited_by: string;
          created_at?: string;
          expires_at?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["staff_invites"]["Insert"]>;
        Relationships: [];
      };
      attendance_records: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          status: AttendanceStatus;
          signed_in_at: string | null;
          signed_in_by: string | null;
          signed_out_at: string | null;
          signed_out_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          status: AttendanceStatus;
          signed_in_at?: string | null;
          signed_in_by?: string | null;
          signed_out_at?: string | null;
          signed_out_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Insert"]>;
        Relationships: [];
      };
      daily_sleep: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          sleep_start: string;
          sleep_end: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          sleep_start: string;
          sleep_end?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_sleep"]["Insert"]>;
        Relationships: [];
      };
      daily_food: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          meal_type: "breakfast" | "morning_tea" | "lunch" | "afternoon_tea" | "late_snack" | "other";
          food_offered: string;
          amount_eaten: "all" | "most" | "half" | "little" | "none" | "na";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          meal_type: "breakfast" | "morning_tea" | "lunch" | "afternoon_tea" | "late_snack" | "other";
          food_offered: string;
          amount_eaten?: "all" | "most" | "half" | "little" | "none" | "na";
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_food"]["Insert"]>;
        Relationships: [];
      };
      child_health_plans: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          plan_type: "asthma" | "anaphylaxis" | "diabetes" | "allergies" | "epilepsy" | "other";
          plan_name: string;
          triggers: string | null;
          signs_and_symptoms: string | null;
          emergency_steps: string;
          emergency_medication: string | null;
          review_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          plan_type: "asthma" | "anaphylaxis" | "diabetes" | "allergies" | "epilepsy" | "other";
          plan_name: string;
          triggers?: string | null;
          signs_and_symptoms?: string | null;
          emergency_steps: string;
          emergency_medication?: string | null;
          review_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["child_health_plans"]["Insert"]>;
        Relationships: [];
      };
      excursions: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          destination: string;
          excursion_date: string;
          departure_time: string | null;
          return_time: string | null;
          transport_method: string | null;
          supervisor_ratio: string | null;
          notes: string | null;
          linked_risk_assessment_id: string | null;
          linked_permission_slip_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          destination: string;
          excursion_date: string;
          departure_time?: string | null;
          return_time?: string | null;
          transport_method?: string | null;
          supervisor_ratio?: string | null;
          notes?: string | null;
          linked_risk_assessment_id?: string | null;
          linked_permission_slip_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["excursions"]["Insert"]>;
        Relationships: [];
      };
      excursion_attendees: {
        Row: {
          excursion_id: string;
          child_id: string;
        };
        Insert: {
          excursion_id: string;
          child_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["excursion_attendees"]["Insert"]>;
        Relationships: [];
      };
      staff_reflections: {
        Row: {
          id: string;
          owner_user_id: string;
          author_user_id: string;
          reflection_type: "post_incident" | "end_of_day" | "general";
          context_text: string;
          ai_questions: string[];
          responses: string[];
          key_learning: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          author_user_id: string;
          reflection_type: "post_incident" | "end_of_day" | "general";
          context_text: string;
          ai_questions?: string[];
          responses?: string[];
          key_learning?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_reflections"]["Insert"]>;
        Relationships: [];
      };
      parent_absence_notifications: {
        Row: {
          id: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          absence_date: string;
          reason: string | null;
          created_at: string;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
        };
        Insert: {
          id?: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          absence_date: string;
          reason?: string | null;
          created_at?: string;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["parent_absence_notifications"]["Insert"]>;
        Relationships: [];
      };
      staff_compliance: {
        Row: {
          id: string;
          owner_user_id: string;
          staff_user_id: string;
          compliance_type: "wwcc" | "first_aid" | "anaphylaxis" | "asthma" | "child_protection" | "fire_safety" | "food_safety" | "other";
          label: string;
          reference_number: string | null;
          issued_date: string | null;
          expiry_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          staff_user_id: string;
          compliance_type: "wwcc" | "first_aid" | "anaphylaxis" | "asthma" | "child_protection" | "fire_safety" | "food_safety" | "other";
          label: string;
          reference_number?: string | null;
          issued_date?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_compliance"]["Insert"]>;
        Relationships: [];
      };
      parent_notifications: {
        Row: {
          id: string;
          recipient_user_id: string;
          type: "observation_shared" | "new_message" | "permission_slip" | "wall_post_approved" | "absence_acknowledged";
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_user_id: string;
          type: "observation_shared" | "new_message" | "permission_slip" | "wall_post_approved" | "absence_acknowledged";
          title: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_notifications"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          owner_user_id: string;
          invoice_number: string;
          parent_user_id: string | null;
          bill_to_name: string;
          bill_to_email: string | null;
          child_id: string | null;
          period_start: string;
          period_end: string;
          due_date: string | null;
          notes: string | null;
          status: InvoiceStatus;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          invoice_number: string;
          parent_user_id?: string | null;
          bill_to_name: string;
          bill_to_email?: string | null;
          child_id?: string | null;
          period_start: string;
          period_end: string;
          due_date?: string | null;
          notes?: string | null;
          status?: InvoiceStatus;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          quantity?: number;
          unit_price_cents: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
        Relationships: [];
      };
      waiting_list_enquiries: {
        Row: {
          id: string;
          owner_user_id: string;
          child_first_name: string;
          child_date_of_birth: string | null;
          preferred_start_date: string | null;
          room_id: string | null;
          session_preference: SessionPreference;
          parent_name: string;
          parent_email: string | null;
          parent_phone: string | null;
          notes: string | null;
          status: WaitingListStatus;
          enquiry_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_first_name: string;
          child_date_of_birth?: string | null;
          preferred_start_date?: string | null;
          room_id?: string | null;
          session_preference?: SessionPreference;
          parent_name: string;
          parent_email?: string | null;
          parent_phone?: string | null;
          notes?: string | null;
          status?: WaitingListStatus;
          enquiry_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waiting_list_enquiries"]["Insert"]>;
        Relationships: [];
      };
      child_attendance_days: {
        Row: {
          id: string;
          child_id: string;
          owner_user_id: string;
          day_of_week: number;
          session_type: "full_day" | "morning" | "afternoon";
        };
        Insert: {
          id?: string;
          child_id: string;
          owner_user_id: string;
          day_of_week: number;
          session_type?: "full_day" | "morning" | "afternoon";
        };
        Update: { session_type?: "full_day" | "morning" | "afternoon" };
        Relationships: [];
      };
      daily_routines: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          date: string | null;
          room_id: string | null;
          blocks: RoutineBlock[];
          is_template: boolean;
          focus_topic: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          date?: string | null;
          room_id?: string | null;
          blocks?: RoutineBlock[];
          is_template?: boolean;
          focus_topic?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          date?: string | null;
          room_id?: string | null;
          blocks?: RoutineBlock[];
          is_template?: boolean;
          focus_topic?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      child_follow_ups: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          observation_id: string | null;
          note: string;
          status: "open" | "done";
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          observation_id?: string | null;
          note: string;
          status?: "open" | "done";
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          note?: string;
          status?: "open" | "done";
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      qip_daily_checkins: {
        Row: {
          id: string;
          owner_user_id: string;
          checkin_date: string;
          responses: QipCheckinResponse[];
          overall_notes: string | null;
          submitted_by: string;
          flagged_areas: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          checkin_date: string;
          responses?: QipCheckinResponse[];
          overall_notes?: string | null;
          submitted_by: string;
          flagged_areas?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          responses?: QipCheckinResponse[];
          overall_notes?: string | null;
          submitted_by?: string;
          flagged_areas?: number[];
          updated_at?: string;
        };
        Relationships: [];
      };
      casual_day_requests: {
        Row: {
          id: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          requested_date: string;
          session_type: "full_day" | "morning" | "afternoon";
          notes: string | null;
          status: "pending" | "approved" | "declined";
          responded_by: string | null;
          responded_at: string | null;
          response_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_user_id: string;
          child_id: string;
          educator_user_id: string;
          requested_date: string;
          session_type?: "full_day" | "morning" | "afternoon";
          notes?: string | null;
          status?: "pending" | "approved" | "declined";
          responded_by?: string | null;
          responded_at?: string | null;
          response_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["casual_day_requests"]["Insert"]>;
        Relationships: [];
      };
      daily_nappy: {
        Row: {
          id: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          changed_at: string;
          nappy_type: "wet" | "dirty" | "both" | "dry" | "na";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          child_id: string;
          date: string;
          changed_at: string;
          nappy_type: "wet" | "dirty" | "both" | "dry" | "na";
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_nappy"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_linked_parent: {
        Args: { _child_id: string };
        Returns: boolean;
      };
      get_child_invite_preview: {
        Args: { _token: string };
        Returns: {
          child_first_name: string;
          status: string;
          expires_at: string;
        }[];
      };
      accept_child_invite: {
        Args: { _token: string };
        Returns: string;
      };
      has_service_role: {
        Args: { _owner_user_id: string; _min_role: string };
        Returns: boolean;
      };
      my_service_owner_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      start_new_service: {
        Args: { _name: string };
        Returns: string;
      };
      get_staff_invite_preview: {
        Args: { _token: string };
        Returns: {
          service_name: string;
          invited_role: string;
          status: string;
          expires_at: string;
        }[];
      };
      accept_staff_invite: {
        Args: { _token: string };
        Returns: string;
      };
      get_shared_observations: {
        Args: { _child_id: string };
        Returns: {
          id: string;
          note_text: string;
          observed_at: string;
          photo_url: string | null;
          activity_title: string | null;
          eylf_codes: string[];
          shared_at: string;
        }[];
      };
      submit_absence_notification: {
        Args: {
          _child_id: string;
          _absence_date: string;
          _reason?: string | null;
        };
        Returns: string;
      };
      submit_casual_day_request: {
        Args: {
          _child_id: string;
          _requested_date: string;
          _session_type?: string;
          _notes?: string | null;
        };
        Returns: string;
      };
    };
  };
}

// Supplemental types for tables not in auto-generated schema
export interface ConversationRow {
  id: string;
  parent_child_link_id: string;
  educator_user_id: string;
  parent_user_id: string;
  child_id: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface StaffAttendanceRow {
  id: string;
  owner_user_id: string;
  user_id: string;
  date: string;
  signed_in_at: string;
  signed_out_at: string | null;
  created_at: string;
}

export interface VisitorRow {
  id: string;
  owner_user_id: string;
  name: string;
  company: string | null;
  reason: string;
  signed_in_at: string;
  signed_out_at: string | null;
  signed_in_by: string | null;
  date: string;
  created_at: string;
}
