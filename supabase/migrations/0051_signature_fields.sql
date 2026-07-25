-- Migration 0051: Authenticated sign-off for medication logs and incident reports
-- Adds legally-required signature fields tied to authenticated accounts

-- ── Medication administration log ────────────────────────────────────────────
-- The administering staff member must explicitly confirm the record
ALTER TABLE medication_administration_log
  ADD COLUMN IF NOT EXISTS administering_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS administering_typed_name text,
  -- Witness must actively countersign (not just be selected)
  ADD COLUMN IF NOT EXISTS witness_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS witness_typed_name text;

-- ── Child incident reports ────────────────────────────────────────────────────
-- 1. Person completing signs explicitly
ALTER TABLE child_incident_reports
  ADD COLUMN IF NOT EXISTS submitter_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitter_typed_name text,
  -- 2. Director/nominated supervisor countersign (Reg 87)
  ADD COLUMN IF NOT EXISTS director_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS director_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS director_typed_name text,
  ADD COLUMN IF NOT EXISTS director_notes text,
  -- 3. Parent acknowledgement (Reg 87)
  ADD COLUMN IF NOT EXISTS parent_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_acknowledged_by_name text,
  ADD COLUMN IF NOT EXISTS parent_acknowledgement_method text
    CHECK (parent_acknowledgement_method IN (
      'signed_in_person','email_confirmation','verbal_confirmed','parent_declined','unable_to_contact'
    ));

-- ── Staff incident reports ────────────────────────────────────────────────────
ALTER TABLE staff_incident_reports
  ADD COLUMN IF NOT EXISTS submitter_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitter_typed_name text,
  -- Director/supervisor countersign
  ADD COLUMN IF NOT EXISTS director_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS director_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS director_typed_name text,
  ADD COLUMN IF NOT EXISTS director_notes text;

-- Indexes for countersign queries
CREATE INDEX IF NOT EXISTS child_incidents_director_signed_idx
  ON child_incident_reports (director_signed_at) WHERE director_signed_at IS NULL;

CREATE INDEX IF NOT EXISTS staff_incidents_director_signed_idx
  ON staff_incident_reports (director_signed_at) WHERE director_signed_at IS NULL;

SELECT 'Migration 0051 complete' AS result;
