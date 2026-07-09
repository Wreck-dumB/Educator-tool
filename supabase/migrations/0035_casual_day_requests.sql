-- Casual day booking: parents request extra days, educators approve/decline.

CREATE TABLE IF NOT EXISTS public.casual_day_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  educator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_date date NOT NULL,
  session_type text NOT NULL DEFAULT 'full_day' CHECK (session_type IN ('full_day', 'morning', 'afternoon')),
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  response_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX casual_day_requests_educator_idx ON public.casual_day_requests (educator_user_id, requested_date);
CREATE INDEX casual_day_requests_parent_idx ON public.casual_day_requests (parent_user_id);

ALTER TABLE public.casual_day_requests ENABLE ROW LEVEL SECURITY;

-- Educators see all requests for their service
CREATE POLICY "Staff can view service casual day requests"
  ON public.casual_day_requests FOR SELECT
  USING (public.has_service_role(educator_user_id, 'staff'));

-- 2IC+ can approve/decline
CREATE POLICY "2IC+ can respond to casual day requests"
  ON public.casual_day_requests FOR UPDATE
  USING (public.has_service_role(educator_user_id, '2ic'));

-- Parents submit via security-definer function (validates link)
CREATE POLICY "Parent can view own casual day requests"
  ON public.casual_day_requests FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_casual_day_request(
  _child_id uuid,
  _requested_date date,
  _session_type text DEFAULT 'full_day',
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _request_id uuid;
BEGIN
  SELECT * INTO _link
  FROM public.parent_child_links
  WHERE child_id = _child_id AND parent_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorised — you are not linked to this child';
  END IF;

  IF _requested_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot request a casual day in the past';
  END IF;

  IF _requested_date > CURRENT_DATE + INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Cannot request casual days more than 90 days in advance';
  END IF;

  INSERT INTO public.casual_day_requests
    (parent_user_id, child_id, educator_user_id, requested_date, session_type, notes)
  VALUES
    (auth.uid(), _child_id, _link.educator_user_id, _requested_date, _session_type, _notes)
  RETURNING id INTO _request_id;

  RETURN _request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_casual_day_request(uuid, date, text, text) TO authenticated;
