-- Quality Improvement Plans (QIP) - a continuously-updated document under
-- ACECQA's National Quality Standard, separate from the policy builder
-- (policies are individual procedure documents; a QIP is one evolving,
-- whole-of-service self-assessment + improvement-tracking document).
--
-- nqs_standards is a seeded reference table (read-only to authenticated
-- users, same pattern as eylf_outcomes) covering the current NQS structure:
-- 7 Quality Areas, 15 Standards, 40 Elements (in effect since the 1 Feb
-- 2018 NQS revision - this superseded the original 2012 structure of 18
-- standards/58 elements, confirmed via ACECQA's own current QIP guidance).
-- We seed at Standard granularity (not all 40 Elements) to match the level
-- eylf_outcomes already uses for EYLF sub-outcomes, and because ACECQA's
-- own QIP guidance is explicit that a QIP does not need to address every
-- standard/element - only the key areas for improvement.
create table public.nqs_standards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quality_area_number int not null check (quality_area_number between 1 and 7),
  quality_area_title text not null,
  standard_title text not null,
  standard_text text not null,
  created_at timestamptz not null default now()
);

alter table public.nqs_standards enable row level security;

create policy "Authenticated users can read NQS standards"
  on public.nqs_standards for select
  to authenticated
  using (true);

insert into public.nqs_standards (code, quality_area_number, quality_area_title, standard_title, standard_text) values
('1.1', 1, 'Educational program and practice', 'Program', 'The educational program enhances each child''s learning and development.'),
('1.2', 1, 'Educational program and practice', 'Practice', 'Educators facilitate and extend each child''s learning and development.'),
('1.3', 1, 'Educational program and practice', 'Assessment and planning', 'Educators and coordinators take a planned and reflective approach to implementing the program for each child.'),
('2.1', 2, 'Children''s health and safety', 'Health', 'Each child''s health and physical activity is supported and promoted.'),
('2.2', 2, 'Children''s health and safety', 'Safety', 'Each child is protected.'),
('3.1', 3, 'Physical environment', 'Design', 'The design of the facilities is appropriate for the operation of a service.'),
('3.2', 3, 'Physical environment', 'Use', 'The service environment is inclusive, promotes competence and supports exploration and play-based learning.'),
('4.1', 4, 'Staffing arrangements', 'Staffing arrangements', 'Staffing arrangements enhance children''s learning and development.'),
('4.2', 4, 'Staffing arrangements', 'Professionalism', 'Management, educators and staff are collaborative, respectful and ethical.'),
('5.1', 5, 'Relationships with children', 'Relationships between educators and children', 'Respectful and equitable relationships are maintained with each child.'),
('5.2', 5, 'Relationships with children', 'Relationships between children', 'Each child is supported to build and maintain sensitive and responsive relationships.'),
('6.1', 6, 'Collaborative partnerships with families and communities', 'Supportive relationships with families', 'Respectful relationships with families are developed and maintained and families are supported in their parenting role.'),
('6.2', 6, 'Collaborative partnerships with families and communities', 'Collaborative partnerships', 'Collaborative partnerships enhance children''s inclusion, learning and wellbeing.'),
('7.1', 7, 'Governance and leadership', 'Governance', 'Governance supports the operation of a quality service that is child safe.'),
('7.2', 7, 'Governance and leadership', 'Leadership', 'Effective leadership builds and promotes a positive organisational culture and professional learning community.');

-- One evolving QIP per educator (single-tenant, same owner_user_id pattern
-- as the rest of SparkPlay - not part of the parent portal; ACECQA does
-- expect a QIP to be available to families on request, but that's a future
-- tie-in to the parent-document-sharing work, not in scope here).
create table public.quality_improvement_plans (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Quality Improvement Plan',
  context_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quality_improvement_plans enable row level security;

create policy "Owner can view own QIP" on public.quality_improvement_plans for select using (owner_user_id = auth.uid());
create policy "Owner can insert own QIP" on public.quality_improvement_plans for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own QIP" on public.quality_improvement_plans for update using (owner_user_id = auth.uid());
create policy "Owner can delete own QIP" on public.quality_improvement_plans for delete using (owner_user_id = auth.uid());

-- standard_code is intentionally NOT a foreign key to nqs_standards(code) --
-- it's validated server-side against the seeded table before insert (same
-- guardrail as activity_eylf_links never trusting an AI-suggested EYLF
-- code blindly), and left nullable since a strength/improvement item
-- doesn't always map to one specific standard.
create table public.qip_items (
  id uuid primary key default gen_random_uuid(),
  qip_id uuid not null references public.quality_improvement_plans(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  quality_area_number int not null check (quality_area_number between 1 and 7),
  standard_code text,
  item_type text not null check (item_type in ('strength', 'improvement')),
  description text not null,
  priority text check (priority in ('low', 'medium', 'high')),
  success_measure text,
  steps text[] not null default '{}',
  timeframe text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'achieved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index qip_items_qip_id_idx on public.qip_items (qip_id);

alter table public.qip_items enable row level security;

create policy "Owner can view own QIP items" on public.qip_items for select using (owner_user_id = auth.uid());
create policy "Owner can insert own QIP items" on public.qip_items for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own QIP items" on public.qip_items for update using (owner_user_id = auth.uid());
create policy "Owner can delete own QIP items" on public.qip_items for delete using (owner_user_id = auth.uid());
