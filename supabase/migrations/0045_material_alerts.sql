-- ─── Material alert lead time on services ────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS material_alert_lead_days int NOT NULL DEFAULT 14;

-- ─── Staff notifications (in-app alerts for director / 2IC) ──────────────────
CREATE TABLE public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('material_order_alert')),
  title text NOT NULL,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their own staff notifications"
  ON public.staff_notifications FOR SELECT
  USING (recipient_user_id = auth.uid() AND public.has_service_role(owner_user_id, 'staff'));

CREATE POLICY "Director/2IC can mark own notifications read"
  ON public.staff_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid() AND public.has_service_role(owner_user_id, '2ic'));

CREATE INDEX staff_notifications_recipient_idx ON public.staff_notifications (recipient_user_id, created_at DESC);

-- ─── Material order alert deduplication ──────────────────────────────────────
-- One row per service (owner_user_id). Prevents re-alerting within a cooldown window.
CREATE TABLE public.material_order_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  materials_needed jsonb NOT NULL,
  lead_days int NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.material_order_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Director/2IC can view own service material alerts"
  ON public.material_order_alerts FOR SELECT
  USING (public.has_service_role(owner_user_id, '2ic'));


-- ─── Core alert function ──────────────────────────────────────────────────────
-- Scans all services for upcoming activities whose materials are not fully in
-- stock, then creates staff_notifications rows for director + 2IC recipients.
-- Respects a 3-day cooldown per service to avoid spamming.
-- Called by pg_cron daily and also by the /api/material-alerts HTTP route.
CREATE OR REPLACE FUNCTION public.process_material_order_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _svc           RECORD;
  _lead_days     int;
  _horizon       date;
  _entry         RECORD;
  _act_materials text[];
  _mat_name      text;
  _match_count   int;
  _missing       text[];
  _low_stock     text[];
  _last_alert    timestamptz;
  _staff         RECORD;
  _notif_count   int := 0;
  _needed_json   jsonb;
BEGIN
  FOR _svc IN
    SELECT s.id AS service_id,
           s.director_user_id,
           COALESCE(s.material_alert_lead_days, 14) AS lead_days
    FROM services s
  LOOP
    _lead_days := _svc.lead_days;
    _horizon   := CURRENT_DATE + _lead_days;

    _missing   := ARRAY[]::text[];
    _low_stock := ARRAY[]::text[];

    -- Collect materials needed across ALL upcoming program entries for this service
    FOR _entry IN
      SELECT ga.materials_used
      FROM program_entries pe
      JOIN programs p ON p.id = pe.program_id
      JOIN generated_activities ga ON ga.id = pe.activity_id
      WHERE p.owner_user_id = _svc.director_user_id
        AND pe.activity_id IS NOT NULL
        AND pe.day_date > CURRENT_DATE
        AND pe.day_date <= _horizon
    LOOP
      _act_materials := _entry.materials_used;
      IF _act_materials IS NULL OR array_length(_act_materials, 1) IS NULL THEN
        CONTINUE;
      END IF;

      FOREACH _mat_name IN ARRAY _act_materials LOOP
        -- 1. In stock and above threshold → skip
        SELECT COUNT(*) INTO _match_count
        FROM materials m
        WHERE m.owner_user_id = _svc.director_user_id
          AND (
            m.name ILIKE _mat_name
            OR _mat_name ILIKE ('%' || m.name || '%')
            OR m.name ILIKE ('%' || _mat_name || '%')
          )
          AND m.quantity IS NOT NULL
          AND m.low_stock_threshold IS NOT NULL
          AND m.quantity > m.low_stock_threshold;

        IF _match_count > 0 THEN CONTINUE; END IF;

        -- 2. In inventory but low or untracked quantity?
        SELECT COUNT(*) INTO _match_count
        FROM materials m
        WHERE m.owner_user_id = _svc.director_user_id
          AND (
            m.name ILIKE _mat_name
            OR _mat_name ILIKE ('%' || m.name || '%')
            OR m.name ILIKE ('%' || _mat_name || '%')
          );

        IF _match_count > 0 THEN
          -- in inventory but low or no quantity tracking
          IF NOT (_low_stock @> ARRAY[_mat_name]) THEN
            _low_stock := _low_stock || _mat_name;
          END IF;
        ELSE
          IF NOT (_missing @> ARRAY[_mat_name]) THEN
            _missing := _missing || _mat_name;
          END IF;
        END IF;
      END LOOP;
    END LOOP;

    -- Nothing to source → skip this service
    IF (array_length(_missing, 1) IS NULL OR array_length(_missing, 1) = 0)
       AND (array_length(_low_stock, 1) IS NULL OR array_length(_low_stock, 1) = 0)
    THEN
      CONTINUE;
    END IF;

    -- Cooldown: skip if alerted within the last 3 days
    SELECT sent_at INTO _last_alert
    FROM material_order_alerts
    WHERE owner_user_id = _svc.director_user_id;

    IF _last_alert IS NOT NULL AND _last_alert > NOW() - INTERVAL '3 days' THEN
      CONTINUE;
    END IF;

    _needed_json := jsonb_build_object(
      'not_in_inventory', to_jsonb(COALESCE(_missing, ARRAY[]::text[])),
      'low_stock',        to_jsonb(COALESCE(_low_stock, ARRAY[]::text[])),
      'horizon',          _horizon::text,
      'lead_days',        _lead_days
    );

    -- Notify director + all active 2IC
    FOR _staff IN
      SELECT sm.user_id
      FROM staff_memberships sm
      WHERE sm.service_id = _svc.service_id
        AND sm.status = 'active'
        AND sm.role IN ('director', '2ic')
    LOOP
      INSERT INTO staff_notifications
        (owner_user_id, recipient_user_id, type, title, body, href)
      VALUES (
        _svc.director_user_id,
        _staff.user_id,
        'material_order_alert',
        format('%s item(s) need ordering before upcoming activities',
          COALESCE(array_length(_missing, 1), 0) + COALESCE(array_length(_low_stock, 1), 0)
        ),
        format('Check inventory — %s needed, %s low. Activities planned within %s days.',
          COALESCE(array_length(_missing, 1), 0),
          COALESCE(array_length(_low_stock, 1), 0),
          _lead_days
        ),
        '/materials'
      );
      _notif_count := _notif_count + 1;
    END LOOP;

    -- Record/refresh deduplication row
    INSERT INTO material_order_alerts
      (owner_user_id, materials_needed, lead_days, sent_at)
    VALUES
      (_svc.director_user_id, _needed_json, _lead_days, NOW())
    ON CONFLICT (owner_user_id) DO UPDATE
      SET materials_needed = EXCLUDED.materials_needed,
          lead_days        = EXCLUDED.lead_days,
          sent_at          = NOW();

  END LOOP;

  RETURN jsonb_build_object('notifications_created', _notif_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_material_order_alerts() TO service_role;


-- ─── pg_cron schedule ─────────────────────────────────────────────────────────
-- Runs at 21:00 UTC daily ≈ 7:00 AM AEST (UTC+10) / 8:00 AM AEDT (UTC+11).
-- pg_cron is enabled by default on Supabase hosted projects.
-- If cron.schedule throws "extension not available", enable pg_cron in
-- Supabase dashboard → Database → Extensions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'sparkplay-material-alerts',
      '0 21 * * *',
      'SELECT public.process_material_order_alerts()'
    );
  END IF;
END$$;
