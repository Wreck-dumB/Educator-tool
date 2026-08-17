-- Migration 0059: Annual leave calendar
-- One row per staff member per leave day, mirroring the staff_roster shape
-- (see 0046_competitive_features.sql for the pattern this follows).

CREATE TABLE IF NOT EXISTS public.staff_leave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'annual'
    CHECK (leave_type IN ('annual', 'sick', 'public_holiday', 'other')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, staff_user_id, leave_date)
);
ALTER TABLE public.staff_leave ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS staff_leave_service_date_idx ON public.staff_leave (owner_user_id, leave_date);
CREATE INDEX IF NOT EXISTS staff_leave_staff_idx ON public.staff_leave (staff_user_id, leave_date);

-- v1: director/2ic enter and manage leave on behalf of staff; all active staff can view.
-- Self-service leave requests with an approval flow would be a separate future feature.
CREATE POLICY "2IC+ can manage staff leave" ON public.staff_leave FOR ALL
  USING  (public.has_service_role(owner_user_id, '2ic'))
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Staff can view leave" ON public.staff_leave FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));
