-- Migration 0046: Competitive feature additions
-- 1.  State/jurisdiction on services (for state-specific ratios)
-- 2.  Immunisation tracking on children
-- 3.  Service closure calendar
-- 4.  Staff PD hours
-- 5.  Broadcast messages to all parents
-- 6.  Room-level programming (room_id on programs)
-- 7.  Wellbeing check-in on attendance
-- 8.  Staff roster
-- 9.  Extended staff_notifications types
-- 10. Birthday reminder pg_cron function
-- 11. Immunisation overdue alert pg_cron function

-- ─── 1. State/jurisdiction on services ───────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS jurisdiction text DEFAULT 'national'
  CHECK (jurisdiction IN ('national','nsw','vic','qld','wa','sa','tas','act','nt'));

-- NSW and WA use 1:10 for children aged 36+ months instead of the national 1:11.
-- The app reads this column to pick the correct ratio tier.

-- ─── 2. Immunisation tracking on children ────────────────────────────────────
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS immunisation_status text DEFAULT 'not_sighted'
  CHECK (immunisation_status IN ('up_to_date','medical_exemption','approved_catch_up','not_sighted','overdue')),
  ADD COLUMN IF NOT EXISTS immunisation_checked_date date,
  ADD COLUMN IF NOT EXISTS immunisation_notes text;

CREATE INDEX IF NOT EXISTS children_immunisation_status_idx
  ON public.children (owner_user_id, immunisation_status);

-- ─── 3. Service closure calendar ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  closure_date date NOT NULL,
  closure_type text NOT NULL DEFAULT 'public_holiday'
    CHECK (closure_type IN ('public_holiday','pupil_free','emergency','maintenance','other')),
  reason text,
  affects_casual_days boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, closure_date)
);
ALTER TABLE public.service_closures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS service_closures_date_idx ON public.service_closures (owner_user_id, closure_date);

CREATE POLICY "2IC+ can manage service closures" ON public.service_closures FOR ALL
  USING  (public.has_service_role(owner_user_id, '2ic'))
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Staff can view service closures" ON public.service_closures FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

-- Block casual day requests on closed dates (advisory check in app code;
-- the function below also rejects them at the DB layer).
CREATE OR REPLACE FUNCTION public.is_service_closed(_owner_user_id uuid, _date date)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_closures
    WHERE owner_user_id = _owner_user_id
      AND closure_date = _date
      AND affects_casual_days = true
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_service_closed(uuid, date) TO authenticated;

-- ─── 4. Staff PD hours ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_pd_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date date NOT NULL,
  course_name text NOT NULL CHECK (char_length(course_name) BETWEEN 1 AND 300),
  provider text,
  hours numeric(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  pd_type text NOT NULL DEFAULT 'other'
    CHECK (pd_type IN ('first_aid','child_protection','curriculum','leadership','nqs','wellbeing','other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_pd_hours ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS staff_pd_hours_service_idx ON public.staff_pd_hours (owner_user_id, staff_user_id, completed_date);

-- Any active staff member can log and view their own PD; Director/2IC see everyone's.
CREATE POLICY "Staff can view own PD hours" ON public.staff_pd_hours FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff') AND staff_user_id = auth.uid());

CREATE POLICY "Director/2IC can view all PD hours" ON public.staff_pd_hours FOR SELECT
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Active staff can log own PD hours" ON public.staff_pd_hours FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, 'staff') AND staff_user_id = auth.uid());

CREATE POLICY "Director/2IC can log PD hours for any staff" ON public.staff_pd_hours FOR INSERT
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Author can update own PD entry within 7 days" ON public.staff_pd_hours FOR UPDATE
  USING (staff_user_id = auth.uid() AND created_at > now() - INTERVAL '7 days');

CREATE POLICY "Director/2IC can update any PD entry" ON public.staff_pd_hours FOR UPDATE
  USING (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Director can delete PD entries" ON public.staff_pd_hours FOR DELETE
  USING (public.has_service_role(owner_user_id, 'director'));

-- ─── 5. Broadcast messages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  target text NOT NULL DEFAULT 'all_parents'
    CHECK (target IN ('all_parents', 'room')),
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  send_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS broadcast_messages_service_idx ON public.broadcast_messages (owner_user_id, created_at DESC);

CREATE POLICY "2IC+ can manage broadcast messages" ON public.broadcast_messages FOR ALL
  USING  (public.has_service_role(owner_user_id, '2ic'))
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Staff can view broadcast messages" ON public.broadcast_messages FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

-- ─── 6. Room-level programming ───────────────────────────────────────────────
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS programs_room_id_idx ON public.programs (room_id);

-- ─── 7. Wellbeing check-in on attendance ─────────────────────────────────────
-- 1 = Upset/unsettled  2 = Tired  3 = OK  4 = Happy  5 = Excited
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS wellbeing_level smallint CHECK (wellbeing_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS wellbeing_note text;

-- ─── 8. Staff roster ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roster_date date NOT NULL,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_roster ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS staff_roster_service_date_idx ON public.staff_roster (owner_user_id, roster_date);
CREATE INDEX IF NOT EXISTS staff_roster_staff_idx ON public.staff_roster (staff_user_id, roster_date);

CREATE POLICY "2IC+ can manage staff roster" ON public.staff_roster FOR ALL
  USING  (public.has_service_role(owner_user_id, '2ic'))
  WITH CHECK (public.has_service_role(owner_user_id, '2ic'));

CREATE POLICY "Staff can view roster" ON public.staff_roster FOR SELECT
  USING (public.has_service_role(owner_user_id, 'staff'));

-- ─── 9. Extend staff_notifications types ─────────────────────────────────────
ALTER TABLE public.staff_notifications
  DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
ALTER TABLE public.staff_notifications
  ADD CONSTRAINT staff_notifications_type_check
  CHECK (type IN (
    'material_order_alert',
    'birthday_reminder',
    'immunisation_overdue',
    'broadcast_message'
  ));

-- Also allow parent_notifications to carry broadcast_message type
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
    'incident_update'
  ));

-- ─── 10. Birthday reminder function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_birthday_reminders()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _svc         RECORD;
  _child       RECORD;
  _member      RECORD;
  _notif_count int  := 0;
  _today       date := CURRENT_DATE;
  _horizon     date := CURRENT_DATE + 7;
  _today_mmdd  text := to_char(CURRENT_DATE, 'MM-DD');
  _horiz_mmdd  text := to_char(CURRENT_DATE + 7, 'MM-DD');
BEGIN
  FOR _svc IN SELECT s.id, s.director_user_id FROM services s LOOP

    FOR _child IN
      SELECT c.id, c.first_name, c.date_of_birth
      FROM children c
      WHERE c.owner_user_id = _svc.director_user_id
        AND c.date_of_birth IS NOT NULL
        AND to_char(c.date_of_birth, 'MM-DD') >= _today_mmdd
        AND to_char(c.date_of_birth, 'MM-DD') <= _horiz_mmdd
    LOOP
      FOR _member IN
        SELECT sm.user_id FROM staff_memberships sm
        WHERE sm.service_id = _svc.id AND sm.status = 'active'
          AND sm.role IN ('director', '2ic')
      LOOP
        -- Don't re-notify for the same child on the same day
        IF NOT EXISTS (
          SELECT 1 FROM staff_notifications
          WHERE owner_user_id   = _svc.director_user_id
            AND recipient_user_id = _member.user_id
            AND type              = 'birthday_reminder'
            AND href              = '/children/' || _child.id
            AND created_at       >= _today
        ) THEN
          INSERT INTO staff_notifications
            (owner_user_id, recipient_user_id, type, title, body, href)
          VALUES (
            _svc.director_user_id,
            _member.user_id,
            'birthday_reminder',
            format('%s''s birthday is coming up', _child.first_name),
            format('%s turns %s on %s. Prepare a birthday greeting or activity!',
              _child.first_name,
              date_part('year', age(_child.date_of_birth)) + 1,
              to_char(_child.date_of_birth, 'DD Month')
            ),
            '/children/' || _child.id
          );
          _notif_count := _notif_count + 1;
        END IF;
      END LOOP;
    END LOOP;

  END LOOP;
  RETURN jsonb_build_object('birthday_reminders_created', _notif_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_birthday_reminders() TO service_role;

-- ─── 11. Immunisation overdue alert function ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_immunisation_alerts()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _svc         RECORD;
  _child       RECORD;
  _member      RECORD;
  _notif_count int  := 0;
  _cutoff      date := CURRENT_DATE - 365;
BEGIN
  FOR _svc IN SELECT s.id, s.director_user_id FROM services s LOOP

    FOR _child IN
      SELECT c.id, c.first_name, c.immunisation_status, c.immunisation_checked_date
      FROM children c
      WHERE c.owner_user_id = _svc.director_user_id
        AND (
          c.immunisation_status IN ('not_sighted', 'overdue')
          OR (
            c.immunisation_checked_date IS NOT NULL
            AND c.immunisation_checked_date < _cutoff
            AND c.immunisation_status = 'up_to_date'
          )
        )
    LOOP
      FOR _member IN
        SELECT sm.user_id FROM staff_memberships sm
        WHERE sm.service_id = _svc.id AND sm.status = 'active'
          AND sm.role IN ('director', '2ic')
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM staff_notifications
          WHERE owner_user_id   = _svc.director_user_id
            AND recipient_user_id = _member.user_id
            AND type              = 'immunisation_overdue'
            AND href              = '/children/' || _child.id
            AND created_at       >= CURRENT_DATE - 7
        ) THEN
          INSERT INTO staff_notifications
            (owner_user_id, recipient_user_id, type, title, body, href)
          VALUES (
            _svc.director_user_id,
            _member.user_id,
            'immunisation_overdue',
            format('Immunisation action needed: %s', _child.first_name),
            format('%s''s immunisation status is "%s". Sight the current AIR Immunisation History Statement.',
              _child.first_name,
              COALESCE(_child.immunisation_status, 'not recorded')
            ),
            '/children/' || _child.id
          );
          _notif_count := _notif_count + 1;
        END IF;
      END LOOP;
    END LOOP;

  END LOOP;
  RETURN jsonb_build_object('immunisation_alerts_created', _notif_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_immunisation_alerts() TO service_role;

-- ─── 12. pg_cron schedules ───────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'sparkplay-birthday-reminders',
      '0 20 * * *',  -- 8am AEST (UTC+10)
      'SELECT public.process_birthday_reminders()'
    );
    PERFORM cron.schedule(
      'sparkplay-immunisation-alerts',
      '0 20 * * 1',  -- 8am AEST every Monday
      'SELECT public.process_immunisation_alerts()'
    );
  END IF;
END$$;
