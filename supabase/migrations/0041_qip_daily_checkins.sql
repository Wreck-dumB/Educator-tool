-- Daily end-of-day QIP check-ins.
-- One record per service per day. Provides a dated audit trail showing
-- the centre actively reviews its QIP daily -- satisfying the NSW
-- requirement to produce QIP evidence within 24 hours of a spot check.
--
-- responses JSONB shape (one entry per quality area):
--   [{ qa: 1, question: "...", answer: "yes"|"mostly"|"no", notes: "..." }, ...]
-- flagged_areas is an int[] of QA numbers where answer = "no" (auto-populated
-- server-side, never trusted from the client).
create table public.qip_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  responses jsonb not null default '[]',
  overall_notes text,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  flagged_areas int[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only one check-in per day per service. An UPDATE is allowed (same
  -- calendar day correction) but the date cannot change.
  unique (owner_user_id, checkin_date)
);

create index qip_daily_checkins_owner_date_idx
  on public.qip_daily_checkins (owner_user_id, checkin_date desc);

alter table public.qip_daily_checkins enable row level security;

-- All active staff can read their service's check-ins (audit visibility).
create policy "Active staff can view service QIP check-ins"
  on public.qip_daily_checkins for select
  using (public.has_service_role(owner_user_id, 'staff'));

-- Any active staff member can submit or update today's check-in for their
-- service. submitted_by must equal the caller so attribution is honest.
create policy "Active staff can insert QIP check-in"
  on public.qip_daily_checkins for insert
  with check (
    public.has_service_role(owner_user_id, 'staff')
    and submitted_by = auth.uid()
  );

create policy "Active staff can update same-day QIP check-in"
  on public.qip_daily_checkins for update
  using (
    public.has_service_role(owner_user_id, 'staff')
    and checkin_date = current_date
  )
  with check (
    public.has_service_role(owner_user_id, 'staff')
    and submitted_by = auth.uid()
  );

-- No DELETE policy for anyone -- check-ins are compliance records.
-- A Director who must remove one can do so via service_role in the
-- Supabase dashboard (rare, intentionally hard).
