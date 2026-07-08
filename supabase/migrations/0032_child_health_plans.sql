-- Medical management plans per child (Reg 90 — asthma, anaphylaxis, diabetes, etc.)
-- All active staff can view (emergency access); 2IC+ manage; director-only delete.

CREATE TABLE public.child_health_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('asthma', 'anaphylaxis', 'diabetes', 'allergies', 'epilepsy', 'other')),
  plan_name text NOT NULL CHECK (char_length(plan_name) BETWEEN 1 AND 200),
  triggers text,
  signs_and_symptoms text,
  emergency_steps text NOT NULL CHECK (char_length(emergency_steps) BETWEEN 1 AND 3000),
  emergency_medication text,
  review_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX child_health_plans_owner_idx ON public.child_health_plans (owner_user_id);
CREATE INDEX child_health_plans_child_idx ON public.child_health_plans (child_id);
CREATE INDEX child_health_plans_review_idx ON public.child_health_plans (owner_user_id, review_date) WHERE is_active = true;

ALTER TABLE public.child_health_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view service health plans"
  ON public.child_health_plans FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Active staff can insert health plans"
  ON public.child_health_plans FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Active staff can update health plans"
  ON public.child_health_plans FOR UPDATE
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Director only can delete health plans"
  ON public.child_health_plans FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));
