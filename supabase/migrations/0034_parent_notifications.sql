-- In-app notification records for parents.
-- Created server-side when observations are shared, messages arrive,
-- permission slips are issued, etc. Parents see an unread count in nav.

CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'observation_shared',
    'new_message',
    'permission_slip',
    'wall_post_approved',
    'absence_acknowledged'
  )),
  title text NOT NULL,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parent_notifications_recipient_idx ON public.parent_notifications (recipient_user_id, read_at, created_at DESC);

ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent can view own notifications"
  ON public.parent_notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Parent can mark own notifications read"
  ON public.parent_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Server-side inserts go through the service role (server action context).
-- No client-INSERT policy: recipients cannot create their own notifications.
