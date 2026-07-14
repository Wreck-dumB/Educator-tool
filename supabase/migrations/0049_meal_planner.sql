-- Weekly meal planner: plan grid + slots linked to saved recipes.
-- Shopping list is computed from slot recipe ingredients client-side.

CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, week_start_date)
);

CREATE INDEX meal_plans_owner_week_idx ON public.meal_plans (owner_user_id, week_start_date);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service meal plans" ON public.meal_plans
  FOR SELECT USING (public.has_service_role(owner_user_id, 'staff'));
CREATE POLICY "Staff can insert service meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (public.has_service_role(owner_user_id, 'staff'));
CREATE POLICY "Staff can update service meal plans" ON public.meal_plans
  FOR UPDATE USING (public.has_service_role(owner_user_id, 'staff'));
CREATE POLICY "2IC+ can delete service meal plans" ON public.meal_plans
  FOR DELETE USING (public.has_service_role(owner_user_id, '2ic'));

-- One slot = one meal on one day.
-- recipe_id links to a saved recipe; custom_title for ad-hoc entries when
-- no saved recipe fits (e.g. "Toast and fruit — kitchen's call").
CREATE TABLE public.meal_plan_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','morning_tea','lunch','afternoon_tea','late_snack')),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  custom_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, slot_date, meal_type)
);

CREATE INDEX meal_plan_slots_plan_id_idx ON public.meal_plan_slots (plan_id);

ALTER TABLE public.meal_plan_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service meal plan slots" ON public.meal_plan_slots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.has_service_role(mp.owner_user_id, 'staff'))
  );
CREATE POLICY "Staff can insert service meal plan slots" ON public.meal_plan_slots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.has_service_role(mp.owner_user_id, 'staff'))
  );
CREATE POLICY "Staff can update service meal plan slots" ON public.meal_plan_slots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.has_service_role(mp.owner_user_id, 'staff'))
  );
CREATE POLICY "Staff can delete service meal plan slots" ON public.meal_plan_slots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = plan_id AND public.has_service_role(mp.owner_user_id, 'staff'))
  );
