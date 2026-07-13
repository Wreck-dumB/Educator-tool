-- Migration 0048: Educator tools
-- 1. Transition statements (per-child, AI-drafted, for school/room transitions)
-- 2. NQS self-assessments (service-level rating of each NQS standard)
-- 3. NQS standard ratings (per-standard rating within an assessment)
-- 4. Child milestone observations (per-child observed milestone records)

-- ─── 1. Transition statements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transition_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  transition_type text NOT NULL DEFAULT 'to_school'
    CHECK (transition_type IN ('to_school', 'between_rooms', 'between_services')),
  draft_text text,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, child_id, transition_type)
);

ALTER TABLE public.transition_statements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS transition_statements_child_idx
  ON public.transition_statements (owner_user_id, child_id);

CREATE POLICY "Staff can view service transition statements" ON public.transition_statements
  FOR SELECT USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can insert transition statements" ON public.transition_statements
  FOR INSERT WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can update transition statements" ON public.transition_statements
  FOR UPDATE USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete transition statements" ON public.transition_statements
  FOR DELETE USING (public.has_service_role(owner_user_id, '2ic'));

-- ─── 2. NQS self-assessments (container) ────────────────────────────────────
-- One assessment represents a period (e.g. "2024 Annual"). Multiple drafts
-- can coexist; only one is expected to be active at a time (no enforced
-- single-active constraint — directors may want to compare periods).
CREATE TABLE IF NOT EXISTS public.nqs_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_label text NOT NULL DEFAULT 'Annual Self-Assessment',
  notes text,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nqs_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service NQS assessments" ON public.nqs_self_assessments
  FOR SELECT USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can insert NQS assessments" ON public.nqs_self_assessments
  FOR INSERT WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update NQS assessments" ON public.nqs_self_assessments
  FOR UPDATE USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director can delete NQS assessments" ON public.nqs_self_assessments
  FOR DELETE USING (public.has_service_role(owner_user_id, 'director'));

-- ─── 3. NQS standard ratings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nqs_standard_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.nqs_self_assessments(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  standard_code text NOT NULL REFERENCES public.nqs_standards(code) ON DELETE CASCADE,
  rating text NOT NULL DEFAULT 'working_towards'
    CHECK (rating IN ('working_towards', 'meeting', 'exceeding')),
  evidence_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, standard_code)
);

ALTER TABLE public.nqs_standard_ratings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS nqs_standard_ratings_assessment_idx
  ON public.nqs_standard_ratings (assessment_id);

CREATE POLICY "Staff can view service NQS ratings" ON public.nqs_standard_ratings
  FOR SELECT USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can insert NQS ratings" ON public.nqs_standard_ratings
  FOR INSERT WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update NQS ratings" ON public.nqs_standard_ratings
  FOR UPDATE USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can delete NQS ratings" ON public.nqs_standard_ratings
  FOR DELETE USING (public.has_service_role(owner_user_id, '2ic'));

-- ─── 4. Child milestone observations ─────────────────────────────────────────
-- Records educator observations against specific developmental milestones.
-- milestone_id is nullable to allow custom/freetext milestone entries.
CREATE TABLE IF NOT EXISTS public.child_milestone_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.developmental_milestones(id) ON DELETE SET NULL,
  custom_milestone_text text,
  observed_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT milestone_id_or_custom_text CHECK (
    milestone_id IS NOT NULL OR (custom_milestone_text IS NOT NULL AND char_length(trim(custom_milestone_text)) > 0)
  )
);

ALTER TABLE public.child_milestone_observations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS child_milestone_obs_child_idx
  ON public.child_milestone_observations (owner_user_id, child_id);

CREATE POLICY "Staff can view service milestone observations" ON public.child_milestone_observations
  FOR SELECT USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can insert milestone observations" ON public.child_milestone_observations
  FOR INSERT WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can update milestone observations" ON public.child_milestone_observations
  FOR UPDATE USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete milestone observations" ON public.child_milestone_observations
  FOR DELETE USING (public.has_service_role(owner_user_id, '2ic'));
