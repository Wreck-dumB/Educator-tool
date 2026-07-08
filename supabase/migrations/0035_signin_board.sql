-- Staff sign-in/out: links real staff members to daily attendance events.
-- Replaces the anonymous room_staff_counts integer for identity and audit purposes.
CREATE TABLE public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, user_id, date)
);

CREATE INDEX staff_attendance_owner_date_idx ON public.staff_attendance (owner_user_id, date);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view staff attendance"
  ON public.staff_attendance FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Active staff can sign themselves in"
  ON public.staff_attendance FOR INSERT
  WITH CHECK (
    public.has_service_role(owner_user_id, 'staff')
    AND user_id = auth.uid()
  );

-- Staff can sign themselves out; 2IC+ can update any staff attendance record.
CREATE POLICY "Staff can sign out; 2IC+ can update any"
  ON public.staff_attendance FOR UPDATE
  USING (
    (user_id = auth.uid() AND public.has_service_role(owner_user_id, 'staff'))
    OR public.has_service_role(owner_user_id, '2ic')
  );

CREATE POLICY "Director can delete staff attendance"
  ON public.staff_attendance FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));

-- Visitors: non-staff, non-enrolled people who enter the centre.
-- Included on evacuation lists and the on-site board.
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  company text CHECK (company IS NULL OR char_length(company) <= 200),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  signed_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitors_owner_date_idx ON public.visitors (owner_user_id, date);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view today's visitors"
  ON public.visitors FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Active staff can sign in visitors"
  ON public.visitors FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Active staff can sign out visitors"
  ON public.visitors FOR UPDATE
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete visitor records"
  ON public.visitors FOR DELETE
  USING (public.has_service_role(owner_user_id, '2ic'));
