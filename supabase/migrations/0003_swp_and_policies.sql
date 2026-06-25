-- Safe work procedures (for genuinely hazardous STAFF tasks - chemical use,
-- manual handling, ladder use, garden tools - NOT a legal "SWMS", which is a
-- specific term for the 18 categories of high-risk construction work under
-- the WHS Regulations and generally doesn't apply to daycare activities).
create table public.safe_work_procedures (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  task_title text not null,
  task_description text,
  ppe_required text[] not null default '{}',
  steps text[] not null default '{}',
  hazards jsonb not null default '[]',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index safe_work_procedures_owner_user_id_idx on public.safe_work_procedures (owner_user_id);

alter table public.safe_work_procedures enable row level security;

create policy "Owner can view own safe work procedures" on public.safe_work_procedures for select using (owner_user_id = auth.uid());
create policy "Owner can insert own safe work procedures" on public.safe_work_procedures for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own safe work procedures" on public.safe_work_procedures for update using (owner_user_id = auth.uid());
create policy "Owner can delete own safe work procedures" on public.safe_work_procedures for delete using (owner_user_id = auth.uid());

-- Policy & procedure drafts (the documents required under Education and Care
-- Services National Regulations regs 168-169 - enrolment, excursions,
-- incident/injury/trauma/illness, medical conditions, emergencies, etc).
-- category is free text (not a fixed enum) since ACECQA's exact category list
-- isn't something we hardcode and risk getting subtly wrong/outdated.
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  your_input text not null,
  purpose text,
  scope text,
  procedure_steps text[] not null default '{}',
  related_legislation text[] not null default '{}',
  suggested_additions text[] not null default '{}',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index policies_owner_user_id_idx on public.policies (owner_user_id);

alter table public.policies enable row level security;

create policy "Owner can view own policies" on public.policies for select using (owner_user_id = auth.uid());
create policy "Owner can insert own policies" on public.policies for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own policies" on public.policies for update using (owner_user_id = auth.uid());
create policy "Owner can delete own policies" on public.policies for delete using (owner_user_id = auth.uid());
