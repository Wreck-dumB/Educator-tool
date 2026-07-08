-- Staff reflective practice journaling.
-- Staff log a situation/incident description; Claude generates tailored
-- reflective questions; staff record their answers. 2IC+ can view all
-- reflections for service development; each author always sees their own.

CREATE TABLE public.staff_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_type text NOT NULL
    CHECK (reflection_type IN ('post_incident', 'end_of_day', 'general')),
  context_text text NOT NULL CHECK (char_length(context_text) BETWEEN 10 AND 3000),
  ai_questions jsonb NOT NULL DEFAULT '[]',
  responses jsonb NOT NULL DEFAULT '[]',
  key_learning text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_reflections_owner_idx ON public.staff_reflections (owner_user_id, created_at DESC);
CREATE INDEX staff_reflections_author_idx ON public.staff_reflections (author_user_id, created_at DESC);

ALTER TABLE public.staff_reflections ENABLE ROW LEVEL SECURITY;

-- Author always sees their own reflections.
CREATE POLICY "Author can view own reflections"
  ON public.staff_reflections FOR SELECT
  USING (author_user_id = auth.uid());

-- 2IC+ can view all reflections for the service (for team supervision).
CREATE POLICY "2IC+ can view all service reflections"
  ON public.staff_reflections FOR SELECT
  USING (public.has_service_role(owner_user_id, '2ic'));

-- Any active staff member can write their own reflection.
CREATE POLICY "Active staff can insert own reflection"
  ON public.staff_reflections FOR INSERT
  WITH CHECK (
    public.has_service_role(owner_user_id, 'staff')
    AND author_user_id = auth.uid()
  );

-- Author can update their own reflection (to add answers and key learning).
CREATE POLICY "Author can update own reflection"
  ON public.staff_reflections FOR UPDATE
  USING (author_user_id = auth.uid());

-- Director only can delete reflections.
CREATE POLICY "Director can delete service reflections"
  ON public.staff_reflections FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));
