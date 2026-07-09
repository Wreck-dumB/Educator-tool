-- Staff compliance tracker: WWCC, First Aid, Anaphylaxis, Asthma,
-- Child Protection, mandatory training records with expiry dates.
-- Visible to Director/2IC; each staff member can view their own records.

CREATE TABLE IF NOT EXISTS public.staff_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compliance_type text NOT NULL CHECK (compliance_type IN (
    'wwcc',
    'first_aid',
    'anaphylaxis',
    'asthma',
    'child_protection',
    'fire_safety',
    'food_safety',
    'other'
  )),
  label text NOT NULL,
  reference_number text,
  issued_date date,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_compliance_owner_idx ON public.staff_compliance (owner_user_id);
CREATE INDEX staff_compliance_staff_idx ON public.staff_compliance (staff_user_id);
CREATE INDEX staff_compliance_expiry_idx ON public.staff_compliance (owner_user_id, expiry_date);

ALTER TABLE public.staff_compliance ENABLE ROW LEVEL SECURITY;

-- Director/2IC can view all compliance records for their service
CREATE POLICY "2IC+ can view service staff compliance"
  ON public.staff_compliance FOR SELECT
  USING (public.has_service_role(owner_user_id, '2ic'));

-- Each staff member can view their own compliance records
CREATE POLICY "Staff can view own compliance records"
  ON public.staff_compliance FOR SELECT
  USING (staff_user_id = auth.uid() AND public.has_service_role(owner_user_id, 'staff'));

-- Only Director/2IC can insert, update, delete compliance records
CREATE POLICY "2IC+ can manage staff compliance"
  ON public.staff_compliance FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update staff compliance"
  ON public.staff_compliance FOR UPDATE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director can delete staff compliance"
  ON public.staff_compliance FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));
