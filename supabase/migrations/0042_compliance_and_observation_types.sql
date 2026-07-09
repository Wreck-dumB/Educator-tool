-- Compliance and observation type enhancements
-- Addresses:
--   • Education and Care Services National Regulations 2011 (Regs 87, 161–162, 175)
--   • NSW Children and Young Persons (Care and Protection) Act 1998 (mandatory reporting)
--   • Australian Privacy Act 1988, APP 12 (data retention)
--   • NQS Quality Area 1 (variety of observation methods)

-- ── Observation format types ───────────────────────────────────────────────
-- Adds explicit observation format tagging so centres can use and evidence a
-- variety of documentation methods as expected under NQS QA1.
-- Existing rows default to 'anecdotal' (most common existing format).
alter table public.observations
  add column if not exists observation_type text not null default 'anecdotal'
    check (observation_type in (
      'anecdotal',       -- brief factual account of a specific event
      'learning_story',  -- narrative description of a child's learning journey
      'running_record',  -- sequential, timestamped observation over a period
      'jotting',         -- quick in-the-moment note, expanded later
      'work_sample',     -- documentation of child's output with analysis
      'photo_caption',   -- photo-led observation with reflective caption
      'developmental_note' -- milestone/skill-specific note, may link to milestones table
    )),
  add column if not exists observation_title text,
  add column if not exists observation_context text;

comment on column public.observations.observation_type is
  'Format of documentation per NQS QA1 — supports learning stories, running records, etc.';
comment on column public.observations.observation_title is
  'Title for formats that use one (e.g. learning story title, work sample description, milestone area).';
comment on column public.observations.observation_context is
  'Type-specific secondary field: running record timeframe, educator reflection (work sample / learning story), next steps (developmental note).';

-- ── Enrolment end date — data retention (APP 12) ─────────────────────────
-- Australian Privacy Act 1988 APP 12 requires personal information to be
-- destroyed or de-identified once no longer needed for the purpose collected.
-- Regulation 175(2)(a) requires written enrolment records kept for 3 years
-- after the child ceases to be enrolled. Observations are not legally
-- defined as enrolment records but are practice documentation; local policy
-- on retention should be documented in the service's privacy policy.
-- This field lets the system surface a retention reminder and gates future
-- automated anonymisation workflows.
alter table public.children
  add column if not exists enrolment_ended_at timestamptz;

comment on column public.children.enrolment_ended_at is
  'Date enrolment ceased. Used to surface data-retention obligations under Australian Privacy Act APP 12 and Reg 175.';

-- ── Mandatory reporting fields (NSW s23 obligation) ───────────────────────
-- NSW Children and Young Persons (Care and Protection) Act 1998 s23
-- creates a mandatory obligation for any person who suspects a child is at
-- risk of significant harm. The app surfaces guidance and records whether
-- a report was made, but NEVER auto-submits to DoCS / DCJ — that is a human
-- decision requiring professional judgement.
alter table public.child_incident_reports
  add column if not exists possible_harm_indicator boolean not null default false,
  add column if not exists mandatory_report_made boolean,
  add column if not exists mandatory_report_at timestamptz,
  add column if not exists mandatory_report_by uuid references auth.users(id) on delete set null;

comment on column public.child_incident_reports.possible_harm_indicator is
  'Educator-assessed indicator that this incident may constitute risk of significant harm (NSW s23 trigger for mandatory reporting to DCJ).';
comment on column public.child_incident_reports.mandatory_report_made is
  'Whether a mandatory report was made to the Child Protection Helpline (13 36 27). Null = not yet assessed.';
comment on column public.child_incident_reports.mandatory_report_at is
  'Timestamp of mandatory report to DCJ/Child Protection Helpline.';
comment on column public.child_incident_reports.mandatory_report_by is
  'Staff member who made the mandatory report. Should match completed_by_name for audit trail.';

-- ── Service observation preferences + AI data notice ─────────────────────
-- Lets the Director configure which observation types are enabled for their
-- centre, and records when staff were informed about AI data processing
-- (Australian Privacy Act APP 1 / APP 3 disclosure obligation).
alter table public.services
  add column if not exists preferred_observation_types text[]
    not null default array['anecdotal', 'learning_story', 'jotting']::text[],
  add column if not exists privacy_policy_url text,
  add column if not exists ai_data_notice_accepted_at timestamptz,
  add column if not exists ai_data_notice_accepted_by uuid references auth.users(id) on delete set null;

comment on column public.services.preferred_observation_types is
  'Observation formats enabled for this service. Defaults to the three most common. Director can expand to all 7.';
comment on column public.services.ai_data_notice_accepted_at is
  'When the service acknowledged the AI data processing notice (APP 3 disclosure).';
