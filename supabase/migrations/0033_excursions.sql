-- Excursion planner: links destination, date, risk assessment, permission slip,
-- and attendee list into one place.

CREATE TABLE public.excursions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  destination text NOT NULL CHECK (char_length(destination) BETWEEN 1 AND 300),
  excursion_date date NOT NULL,
  departure_time time,
  return_time time,
  transport_method text,
  supervisor_ratio text,
  notes text,
  linked_risk_assessment_id uuid REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
  linked_permission_slip_id uuid REFERENCES public.permission_slips(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.excursion_attendees (
  excursion_id uuid NOT NULL REFERENCES public.excursions(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  PRIMARY KEY (excursion_id, child_id)
);

CREATE INDEX excursions_owner_idx ON public.excursions (owner_user_id, excursion_date DESC);

ALTER TABLE public.excursions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excursion_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view service excursions"
  ON public.excursions FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "2IC+ can insert excursions"
  ON public.excursions FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "2IC+ can update excursions"
  ON public.excursions FOR UPDATE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director only can delete excursions"
  ON public.excursions FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));

CREATE POLICY "Active staff can view excursion attendees"
  ON public.excursion_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.excursions e
      WHERE e.id = excursion_id AND public.has_service_role(e.owner_user_id, 'staff')
    )
  );

CREATE POLICY "2IC+ can manage excursion attendees"
  ON public.excursion_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.excursions e
      WHERE e.id = excursion_id AND public.has_service_role(e.owner_user_id, '2ic')
    )
  );

CREATE POLICY "2IC+ can remove excursion attendees"
  ON public.excursion_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.excursions e
      WHERE e.id = excursion_id AND public.has_service_role(e.owner_user_id, '2ic')
    )
  );
