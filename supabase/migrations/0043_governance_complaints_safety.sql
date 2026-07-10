-- Governance, complaints, and environment safety enhancements
-- Addresses:
--   • Education and Care Services National Regulations 2011 Reg 176
--     (notification to regulatory authority for serious incidents)
--   • Reg 168 (approved provider & nominated supervisor accountability)
--   • NQS Quality Area 2 (health & safety environment checks)
--   • NQS Quality Area 5.7 & Child Safe Standard 10 (complaints mechanism)
--   • National Principles for Child Safe Organisations (principle 7, 10)

-- ── Reg 176: Regulatory authority notification ──────────────────────────────
-- Reg 176 requires notification to the regulatory authority (ACECQA / state
-- authority) "as soon as practicable" for serious incidents. We record whether
-- the notification was made, when, and by what method — for the audit trail.
alter table public.child_incident_reports
  add column if not exists regulatory_authority_notified boolean not null default false,
  add column if not exists regulatory_authority_notified_at timestamptz,
  add column if not exists regulatory_authority_notification_method text;

comment on column public.child_incident_reports.regulatory_authority_notified is
  'Whether the regulatory authority (ACECQA/state) was notified under Reg 176.';
comment on column public.child_incident_reports.regulatory_authority_notified_at is
  'Date/time notification was made to the regulatory authority.';

-- ── Reg 168: Approved provider & nominated supervisor ──────────────────────
-- The approved provider number and service approval number are issued by ACECQA
-- and the state regulatory authority. The nominated supervisor must be formally
-- designated on record. These are required for any regulatory correspondence.
alter table public.services
  add column if not exists approved_provider_number text,
  add column if not exists service_approval_number text,
  add column if not exists nominated_supervisor_name text,
  add column if not exists nominated_supervisor_phone text,
  add column if not exists nominated_supervisor_email text;

comment on column public.services.approved_provider_number is
  'ACECQA-issued approved provider number (AP xxxxxxx). Required under Reg 168.';
comment on column public.services.service_approval_number is
  'State regulatory authority service approval number. Required for regulatory correspondence.';
comment on column public.services.nominated_supervisor_name is
  'Formally designated nominated supervisor under the Education and Care Services National Law.';

-- ── Complaints log (NQS QA5.7, Child Safe Standards) ──────────────────────
-- NQS QA5.7 requires a documented, accessible complaints procedure for families
-- and staff. Child Safe Standard 10 requires policies for responding to concerns.
-- This table is the audit trail for every complaint or concern received.
create table if not exists public.complaint_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  received_at timestamptz not null default now(),
  complainant_type text not null default 'parent'
    check (complainant_type in (
      'parent',
      'staff',
      'child',
      'community',
      'anonymous',
      'regulatory_body'
    )),
  subject text not null,
  description text not null,
  status text not null default 'received'
    check (status in ('received', 'acknowledged', 'under_review', 'resolved', 'escalated')),
  resolution_notes text,
  resolved_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.complaint_records enable row level security;

create policy "Active staff can view service complaints"
  on public.complaint_records for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Active staff can log complaints"
  on public.complaint_records for insert
  with check (
    public.has_service_role(owner_user_id, 'staff')
    and created_by_user_id = auth.uid()
  );

create policy "2IC+ can update complaints"
  on public.complaint_records for update
  using (public.has_service_role(owner_user_id, '2ic'));

create policy "Director only can delete complaint records"
  on public.complaint_records for delete
  using (public.has_service_role(owner_user_id, 'director'));

-- ── Daily environment safety checks (NQS QA2) ────────────────────────────
-- NQS Quality Area 2 (Children's health and safety) requires ongoing monitoring
-- of the physical environment. A daily check provides evidence for assessment
-- and rating and supports proactive hazard management.
create table if not exists public.environment_safety_checks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null,
  room_id uuid references public.rooms(id) on delete set null,
  items jsonb not null default '{}',
  notes text,
  completed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, check_date, room_id)
);

alter table public.environment_safety_checks enable row level security;

create policy "Active staff can view safety checks"
  on public.environment_safety_checks for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Active staff can insert safety checks"
  on public.environment_safety_checks for insert
  with check (
    public.has_service_role(owner_user_id, 'staff')
    and completed_by_user_id = auth.uid()
  );

create policy "Author or 2IC+ can update safety checks within 24h"
  on public.environment_safety_checks for update
  using (
    (completed_by_user_id = auth.uid() and created_at > now() - interval '24 hours')
    or public.has_service_role(owner_user_id, '2ic')
  );

create policy "Director only can delete safety checks"
  on public.environment_safety_checks for delete
  using (public.has_service_role(owner_user_id, 'director'));

comment on table public.environment_safety_checks is
  'Daily environment walkthrough records. One row per service per room per day. Evidence for NQS QA2 assessment.';
