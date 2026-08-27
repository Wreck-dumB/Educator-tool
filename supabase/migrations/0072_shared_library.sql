-- ─── Topic/skill tagging + cross-tenant shared worksheet library ─────────────
-- Two independent pieces:
-- 1. `topic_tags` on generated_activities — the domain/skill axis (art & craft,
--    sensory, fine motor, etc.) alongside the existing EYLF-outcome and
--    suggested_template tagging, so activities can be searched/reused by "what
--    kind of activity" before generating a new one.
-- 2. `shared_library_activities` — the app's first-ever cross-tenant table.
--    Populated only by an explicit one-way "share" copy (never a live read of
--    another service's generated_activities), gated by a two-stage review:
--    an AI pass (copyright + personal-information check) then a human
--    platform-owner approval before anything becomes visible to other
--    services. This is deliberately a COPY into its own table, not a public
--    RLS policy on generated_activities itself — keeps the existing
--    single-tenant guarantee on that table completely untouched, and means a
--    later edit to the source activity never retroactively changes what's
--    already been shared.

ALTER TABLE public.generated_activities
  ADD COLUMN IF NOT EXISTS topic_tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.shared_library_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Provenance for admin auditing only — never exposed to other services in
  -- the public browse query.
  origin_owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_activity_id uuid REFERENCES public.generated_activities(id) ON DELETE SET NULL,

  title text NOT NULL,
  summary text,
  steps text[] NOT NULL DEFAULT '{}',
  materials_used text[] NOT NULL DEFAULT '{}',
  reflection_prompts text[] NOT NULL DEFAULT '{}',
  age_range text,
  duration_minutes integer,
  energy_level text,
  group_size_fit text,
  eylf_codes text[] NOT NULL DEFAULT '{}',
  topic_tags text[] NOT NULL DEFAULT '{}',

  suggested_template text,
  card_items text[] NOT NULL DEFAULT '{}',
  card_pairs boolean NOT NULL DEFAULT true,
  image_subject text,
  clipart_id text,
  letter_text text,
  matching_left text[] NOT NULL DEFAULT '{}',
  matching_right text[] NOT NULL DEFAULT '{}',
  counting_groups jsonb NOT NULL DEFAULT '[]',
  maze_start_emoji text,
  maze_end_emoji text,
  dot_to_dot_shape text,
  odd_one_out_same text[] NOT NULL DEFAULT '{}',
  odd_one_out_different text,
  cut_and_sort_groups jsonb NOT NULL DEFAULT '[]',

  -- pending_ai_review -> (ai_flagged | pending_admin_review) -> (approved | rejected)
  status text NOT NULL DEFAULT 'pending_ai_review'
    CHECK (status IN ('pending_ai_review', 'ai_flagged', 'pending_admin_review', 'approved', 'rejected')),
  ai_review_notes text,
  ai_reviewed_at timestamptz,
  admin_reviewed_by uuid REFERENCES auth.users(id),
  admin_reviewed_at timestamptz,
  admin_rejection_reason text,

  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_library_activities ENABLE ROW LEVEL SECURITY;

-- A service can see its own submissions regardless of status (to track review progress).
CREATE POLICY "own service reads own submissions" ON public.shared_library_activities
  FOR SELECT
  USING (public.has_service_role(origin_owner_user_id, 'staff'));

-- Anyone can read approved entries — the actual cross-tenant "library" read.
CREATE POLICY "everyone reads approved" ON public.shared_library_activities
  FOR SELECT
  USING (status = 'approved');

-- A service can only submit its own new pending review.
CREATE POLICY "own service inserts own pending submission" ON public.shared_library_activities
  FOR INSERT
  WITH CHECK (public.has_service_role(origin_owner_user_id, 'staff') AND status = 'pending_ai_review');

-- A service may only move ITS OWN row out of pending_ai_review into
-- ai_flagged or pending_admin_review (the AI-review step, run immediately
-- after insert by the same request). It can never set 'approved'/'rejected'
-- itself — those are admin-only, written via the service-role client in the
-- owner-gated approve/reject actions, which bypasses RLS entirely (same
-- pattern as /owner/businesses' updateServiceAccess).
CREATE POLICY "own service advances own pending submission" ON public.shared_library_activities
  FOR UPDATE
  USING (public.has_service_role(origin_owner_user_id, 'staff') AND status = 'pending_ai_review')
  WITH CHECK (status IN ('ai_flagged', 'pending_admin_review'));

CREATE INDEX IF NOT EXISTS shared_library_activities_status_idx ON public.shared_library_activities(status);
CREATE INDEX IF NOT EXISTS shared_library_activities_origin_idx ON public.shared_library_activities(origin_owner_user_id);
