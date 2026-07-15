-- Physical Activity & Nutrition Education (supports Munch & Move documentation)

-- Physical activity sessions (per child, inserted as a batch for group activities)
CREATE TABLE public.physical_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  activity_category text NOT NULL CHECK (activity_category IN (
    'fundamental_movement',
    'structured_game',
    'dance',
    'outdoor_play',
    'yoga_mindfulness',
    'water_play',
    'other'
  )),
  -- Fundamental movement skills checked off (subset of: running, jumping, hopping, skipping,
  -- galloping, throwing, catching, kicking, striking, balancing)
  movement_skills text[] NOT NULL DEFAULT '{}',
  duration_minutes int NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  group_context text NOT NULL DEFAULT 'whole_group' CHECK (group_context IN (
    'individual', 'small_group', 'whole_group'
  )),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX physical_activity_logs_owner_date_idx
  ON public.physical_activity_logs (owner_user_id, date);
CREATE INDEX physical_activity_logs_child_id_idx
  ON public.physical_activity_logs (child_id);

-- Nutrition education sessions (cooking, growing, tasting — separate from daily food intake)
CREATE TABLE public.nutrition_education_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  activity_type text NOT NULL CHECK (activity_type IN (
    'cooking',
    'growing',
    'tasting',
    'food_art',
    'nutrition_discussion',
    'sensory_exploration',
    'other'
  )),
  food_focus text NOT NULL,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  group_context text NOT NULL DEFAULT 'whole_group' CHECK (group_context IN (
    'individual', 'small_group', 'whole_group'
  )),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nutrition_education_logs_owner_date_idx
  ON public.nutrition_education_logs (owner_user_id, date);
CREATE INDEX nutrition_education_logs_child_id_idx
  ON public.nutrition_education_logs (child_id);

-- RLS ------------------------------------------------------------------

ALTER TABLE public.physical_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_education_logs ENABLE ROW LEVEL SECURITY;

-- Educator: staff+ can read/write for their service
CREATE POLICY "Staff can view physical activity logs"
  ON public.physical_activity_logs FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can insert physical activity logs"
  ON public.physical_activity_logs FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can update physical activity logs"
  ON public.physical_activity_logs FOR UPDATE
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete physical activity logs"
  ON public.physical_activity_logs FOR DELETE
  USING (public.has_service_role(owner_user_id, '2ic'));

-- Parent: linked parents can read their child's activity logs
CREATE POLICY "Linked parent can view physical activity logs"
  ON public.physical_activity_logs FOR SELECT
  USING (public.is_linked_parent(child_id));

-- Nutrition education — same pattern
CREATE POLICY "Staff can view nutrition education logs"
  ON public.nutrition_education_logs FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can insert nutrition education logs"
  ON public.nutrition_education_logs FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can update nutrition education logs"
  ON public.nutrition_education_logs FOR UPDATE
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete nutrition education logs"
  ON public.nutrition_education_logs FOR DELETE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Linked parent can view nutrition education logs"
  ON public.nutrition_education_logs FOR SELECT
  USING (public.is_linked_parent(child_id));
