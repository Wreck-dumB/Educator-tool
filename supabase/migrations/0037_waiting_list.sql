-- Waiting list / enrolment enquiry tracking.
-- Educators add enquiries manually (phone, email, walk-in) and move them through statuses.

CREATE TABLE IF NOT EXISTS public.waiting_list_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_first_name text NOT NULL,
  child_date_of_birth date,
  preferred_start_date date,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  session_preference text NOT NULL DEFAULT 'flexible' CHECK (session_preference IN ('full_day', 'morning', 'afternoon', 'flexible')),
  parent_name text NOT NULL,
  parent_email text,
  parent_phone text,
  notes text,
  status text NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry', 'waitlisted', 'offered', 'enrolled', 'declined', 'withdrawn')),
  enquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waiting_list_owner_idx ON public.waiting_list_enquiries (owner_user_id, status, enquiry_date);

ALTER TABLE public.waiting_list_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service waiting list"
  ON public.waiting_list_enquiries FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can add waiting list enquiries"
  ON public.waiting_list_enquiries FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Staff can update waiting list enquiries"
  ON public.waiting_list_enquiries FOR UPDATE
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can delete waiting list enquiries"
  ON public.waiting_list_enquiries FOR DELETE
  USING (public.has_service_role(owner_user_id, '2ic'));
