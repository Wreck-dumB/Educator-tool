-- Educational program planner (NQS Quality Area 1 weekly/fortnightly program).
-- Each program covers a date range; entries are individual planned learning
-- experiences, each optionally linking back to a real saved activity and
-- tagged with the EYLF outcomes it targets.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  -- AI-suggested cultural/national days relevant to this date range, e.g.
  -- [{"name": "Harmony Day", "date": "2026-03-21", "origin": "Australia", "note": "...", "confidence": "high"}]
  -- Lunar-calendar-based dates are explicitly flagged lower-confidence by the
  -- generator since they shift yearly and aren't hardcoded against a real
  -- holiday data source - this is a planning aid, not an authoritative calendar.
  cultural_days jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index programs_owner_user_id_idx on public.programs (owner_user_id);

create table public.program_entries (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_date date not null,
  title text not null,
  notes text,
  activity_id uuid references public.generated_activities(id) on delete set null,
  eylf_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index program_entries_program_id_idx on public.program_entries (program_id);

alter table public.programs enable row level security;
alter table public.program_entries enable row level security;

create policy "Owner can view own programs" on public.programs for select using (owner_user_id = auth.uid());
create policy "Owner can insert own programs" on public.programs for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own programs" on public.programs for update using (owner_user_id = auth.uid());
create policy "Owner can delete own programs" on public.programs for delete using (owner_user_id = auth.uid());

create policy "Owner can view own program entries" on public.program_entries for select
  using (exists (select 1 from public.programs p where p.id = program_id and p.owner_user_id = auth.uid()));
create policy "Owner can insert own program entries" on public.program_entries for insert
  with check (exists (select 1 from public.programs p where p.id = program_id and p.owner_user_id = auth.uid()));
create policy "Owner can update own program entries" on public.program_entries for update
  using (exists (select 1 from public.programs p where p.id = program_id and p.owner_user_id = auth.uid()));
create policy "Owner can delete own program entries" on public.program_entries for delete
  using (exists (select 1 from public.programs p where p.id = program_id and p.owner_user_id = auth.uid()));
