-- Expose daily care charts to linked parents (read-only via is_linked_parent).
-- Also adds parent-submitted absence notifications.

-- Daily sleep: linked parents can read their child's sleep entries
CREATE POLICY "Linked parent can view daily sleep for linked child"
  ON public.daily_sleep FOR SELECT
  USING (public.is_linked_parent(child_id));

-- Daily food: linked parents can read their child's food entries
CREATE POLICY "Linked parent can view daily food for linked child"
  ON public.daily_food FOR SELECT
  USING (public.is_linked_parent(child_id));

-- Daily nappy: linked parents can read their child's nappy entries
CREATE POLICY "Linked parent can view daily nappy for linked child"
  ON public.daily_nappy FOR SELECT
  USING (public.is_linked_parent(child_id));

-- Parent-submitted absence notifications.
-- Parents notify the service; educators see it and mark attendance accordingly.
-- Does NOT directly modify attendance_records — keeps educator control over the register.
CREATE TABLE IF NOT EXISTS public.parent_absence_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  educator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  absence_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (child_id, absence_date)
);

CREATE INDEX parent_absence_notifications_child_id_idx
  ON public.parent_absence_notifications (child_id);
CREATE INDEX parent_absence_notifications_educator_idx
  ON public.parent_absence_notifications (educator_user_id, absence_date);

ALTER TABLE public.parent_absence_notifications ENABLE ROW LEVEL SECURITY;

-- Parent can submit and view their own notifications
CREATE POLICY "Parent can view own absence notifications"
  ON public.parent_absence_notifications FOR SELECT
  USING (parent_user_id = auth.uid());

-- Submit through a security-definer function so we can validate the link
CREATE OR REPLACE FUNCTION public.submit_absence_notification(
  _child_id uuid,
  _absence_date date,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _notification_id uuid;
BEGIN
  -- Caller must be a linked parent for this child
  SELECT * INTO _link
  FROM public.parent_child_links
  WHERE child_id = _child_id AND parent_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorised — you are not linked to this child';
  END IF;

  -- Cannot submit for past dates (more than 1 day ago) or more than 14 days ahead
  IF _absence_date < CURRENT_DATE - INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Cannot submit absence notifications for dates more than 1 day in the past';
  END IF;
  IF _absence_date > CURRENT_DATE + INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Cannot submit absence notifications more than 14 days in advance';
  END IF;

  INSERT INTO public.parent_absence_notifications
    (parent_user_id, child_id, educator_user_id, absence_date, reason)
  VALUES
    (auth.uid(), _child_id, _link.educator_user_id, _absence_date, _reason)
  ON CONFLICT (child_id, absence_date) DO UPDATE
    SET reason = EXCLUDED.reason, acknowledged_at = NULL, acknowledged_by = NULL
  RETURNING id INTO _notification_id;

  RETURN _notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_absence_notification(uuid, date, text) TO authenticated;

-- Educator can view and acknowledge absence notifications for their children
CREATE POLICY "Educator can view absence notifications for own service"
  ON public.parent_absence_notifications FOR SELECT
  USING (has_service_role(educator_user_id, 'staff'));

CREATE POLICY "Educator can acknowledge absence notifications"
  ON public.parent_absence_notifications FOR UPDATE
  USING (has_service_role(educator_user_id, 'staff'))
  WITH CHECK (has_service_role(educator_user_id, 'staff'));
