-- Baseline risk assessments for generated activities.
-- Uses the standard Australian WHS-style risk management method (identify
-- hazard -> rate likelihood x consequence -> assign control measures ->
-- review), matching ACECQA's risk assessment and management guidance for
-- education and care services. This is a STARTING DRAFT for staff to review
-- and build on, not a substitute for the specific risk assessments the
-- National Regulations separately require for excursions (regs 100-103),
-- sleep/rest, or emergencies/evacuation.

create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.generated_activities(id) on delete set null,
  title text not null,
  context_notes text,
  hazards jsonb not null default '[]',
  involves_excursion boolean not null default false,
  involves_sleep_rest boolean not null default false,
  involves_water boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index risk_assessments_owner_user_id_idx on public.risk_assessments (owner_user_id);
create index risk_assessments_activity_id_idx on public.risk_assessments (activity_id);

alter table public.risk_assessments enable row level security;

create policy "Owner can view own risk assessments" on public.risk_assessments for select using (owner_user_id = auth.uid());
create policy "Owner can insert own risk assessments" on public.risk_assessments for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own risk assessments" on public.risk_assessments for update using (owner_user_id = auth.uid());
create policy "Owner can delete own risk assessments" on public.risk_assessments for delete using (owner_user_id = auth.uid());
