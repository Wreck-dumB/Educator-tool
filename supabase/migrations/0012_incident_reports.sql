-- Structured incident record-keeping - NOT AI-generated, these are real
-- regulatory records with fields fixed by law, kept as two separate
-- tables (mirroring the existing risk_assessments/safe_work_procedures
-- split) because children's and staff incidents sit under two different
-- legal regimes with different required fields:
--
-- child_incident_reports: the "Incident, injury, trauma and illness
-- record" required under Regulation 87 of the Education and Care Services
-- National Regulations. Must be completed as soon as practicable, no later
-- than 24 hours after the event, and kept confidential until the child
-- turns 25 - this app does not auto-delete these records.
--
-- staff_incident_reports: a workplace incident/injury report under
-- state-based WHS law (e.g. SafeWork NSW, WorkSafe Vic) - a different
-- regulator and regime to the Education and Care National Law. Some
-- incidents (death, serious injury/illness, "dangerous incident") are
-- legally "notifiable" and require IMMEDIATE notification to the state
-- WHS regulator - is_potentially_notifiable is a prompt for the educator
-- to check this themselves, not an automatic determination or submission;
-- exact criteria and the notification channel differ by state/territory.
create table public.child_incident_reports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  record_type text not null check (record_type in ('incident', 'injury', 'trauma', 'illness')),
  occurred_at timestamptz not null,
  location text,
  description text not null,
  action_taken text,
  parent_notified_at timestamptz,
  parent_notification_method text,
  nominated_supervisor_notified boolean not null default false,
  monitoring_plan text,
  witness_name text,
  completed_by_name text not null,
  completed_by_role text,
  created_at timestamptz not null default now()
);

create index child_incident_reports_child_id_idx on public.child_incident_reports (child_id);

alter table public.child_incident_reports enable row level security;

create policy "Owner can view own child incident reports" on public.child_incident_reports for select using (owner_user_id = auth.uid());
create policy "Owner can insert own child incident reports" on public.child_incident_reports for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own child incident reports" on public.child_incident_reports for update using (owner_user_id = auth.uid());
create policy "Owner can delete own child incident reports" on public.child_incident_reports for delete using (owner_user_id = auth.uid());
-- No parent SELECT policy -- incident records are a staff/regulatory
-- record, not automatically parent-facing (parents are notified directly
-- at the time per parent_notified_at, separate from this record existing).

create table public.staff_incident_reports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null,
  staff_role text,
  occurred_at timestamptz not null,
  location text,
  description text not null,
  injury_description text,
  first_aid_provided boolean not null default false,
  medical_treatment_sought boolean not null default false,
  is_potentially_notifiable boolean not null default false,
  witness_name text,
  immediate_actions text,
  corrective_actions text,
  completed_by_name text not null,
  completed_by_role text,
  created_at timestamptz not null default now()
);

alter table public.staff_incident_reports enable row level security;

create policy "Owner can view own staff incident reports" on public.staff_incident_reports for select using (owner_user_id = auth.uid());
create policy "Owner can insert own staff incident reports" on public.staff_incident_reports for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own staff incident reports" on public.staff_incident_reports for update using (owner_user_id = auth.uid());
create policy "Owner can delete own staff incident reports" on public.staff_incident_reports for delete using (owner_user_id = auth.uid());
