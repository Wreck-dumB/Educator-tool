-- Behaviour Support Plans
-- Collaborative between educators and families, with AI-generated strategy suggestions.
-- Educator owns the plan; parents contribute via a separate response table (same
-- pattern as permission_slip_signatures — no parent UPDATE policy on the main plan).

CREATE TABLE public.behaviour_support_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'under_review', 'archived')),

  -- Child context (educator fills in, may mirror child profile interests)
  child_strengths text NOT NULL DEFAULT '',
  child_interests text NOT NULL DEFAULT '',

  -- Behaviour details
  behaviour_description text NOT NULL,
  behaviour_triggers text NOT NULL DEFAULT '',
  behaviour_frequency text NOT NULL DEFAULT 'sometimes'
    CHECK (behaviour_frequency IN ('rarely', 'sometimes', 'daily', 'multiple_daily')),
  behaviour_function text NOT NULL DEFAULT '',  -- hypothesis: what need is being met

  -- Strategies (AI-assisted, then edited by educator)
  educator_strategies text NOT NULL DEFAULT '',
  suggested_family_strategies text NOT NULL DEFAULT '',  -- educator's suggestions for home consistency
  environment_adjustments text NOT NULL DEFAULT '',
  external_support_notes text NOT NULL DEFAULT '',  -- NDIS, speech path, OT recommendations

  -- Review
  review_date date,
  last_reviewed_at timestamptz,
  review_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bsp_owner_idx ON public.behaviour_support_plans (owner_user_id);
CREATE INDEX bsp_child_idx ON public.behaviour_support_plans (child_id);

-- Separate table for parent/family contributions (parent-owned rows)
-- One row per (plan, parent). Parents cannot touch the main plan table at all.
CREATE TABLE public.behaviour_plan_family_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.behaviour_support_plans(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_strategies text NOT NULL DEFAULT '',
  home_context text NOT NULL DEFAULT '',
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, parent_user_id)
);

CREATE INDEX bsp_family_plan_idx ON public.behaviour_plan_family_responses (plan_id);

-- RLS ----------------------------------------------------------------------

ALTER TABLE public.behaviour_support_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behaviour_plan_family_responses ENABLE ROW LEVEL SECURITY;

-- Educators: staff+ read; 2IC+ write/delete (BSPs are sensitive clinical-ish docs)
CREATE POLICY "Staff can view BSPs for their service"
  ON public.behaviour_support_plans FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can create BSPs"
  ON public.behaviour_support_plans FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update BSPs"
  ON public.behaviour_support_plans FOR UPDATE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director can delete BSPs"
  ON public.behaviour_support_plans FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));

-- Parents: linked parents can view plans for their child
CREATE POLICY "Linked parent can view BSP for linked child"
  ON public.behaviour_support_plans FOR SELECT
  USING (public.is_linked_parent(child_id));

-- Family responses: linked parent can insert/update ONLY their own response
CREATE POLICY "Educator can view family responses for their service BSPs"
  ON public.behaviour_plan_family_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.behaviour_support_plans bsp
      WHERE bsp.id = plan_id
        AND public.has_service_role(bsp.owner_user_id, 'staff')
    )
  );

CREATE POLICY "Linked parent can view own family response"
  ON public.behaviour_plan_family_responses FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Linked parent can submit family response"
  ON public.behaviour_plan_family_responses FOR INSERT
  WITH CHECK (
    parent_user_id = auth.uid()
    AND public.is_linked_parent(child_id)
    AND EXISTS (
      SELECT 1 FROM public.behaviour_support_plans bsp
      WHERE bsp.id = plan_id
        AND bsp.child_id = child_id
        AND bsp.status IN ('active', 'under_review')
    )
  );

CREATE POLICY "Linked parent can update own family response"
  ON public.behaviour_plan_family_responses FOR UPDATE
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());
