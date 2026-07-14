-- Day recap: parents see sign-in/out times + shared observations in diary
-- when their child is signed out.

-- 1. Add daily_summary to parent_notifications type check
ALTER TABLE public.parent_notifications
  DROP CONSTRAINT IF EXISTS parent_notifications_type_check;
ALTER TABLE public.parent_notifications
  ADD CONSTRAINT parent_notifications_type_check
  CHECK (type IN (
    'observation_shared',
    'new_message',
    'permission_slip',
    'wall_post_approved',
    'absence_acknowledged',
    'broadcast_message',
    'incident_update',
    'daily_summary'
  ));

-- 2. Linked parents can read their child's attendance record so the diary
--    can show sign-in/sign-out times and the wellbeing level.
CREATE POLICY "Linked parent can view attendance for linked child"
  ON public.attendance_records FOR SELECT
  USING (public.is_linked_parent(child_id));
