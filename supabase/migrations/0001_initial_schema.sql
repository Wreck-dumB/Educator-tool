-- SparkPlay initial schema
-- Single-tenant (owner_user_id = auth.uid()) tables for the educator activity
-- generator MVP: EYLF outcome reference data, children, materials, generated
-- activities + their EYLF links, and observations + their EYLF links.

create extension if not exists pgcrypto;

-- =========================================
-- eylf_outcomes (seeded reference data, not user-writable)
-- =========================================
create table public.eylf_outcomes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  outcome_number int not null check (outcome_number between 1 and 5),
  outcome_title text not null,
  sub_outcome_text text not null,
  created_at timestamptz not null default now()
);

-- =========================================
-- children (educator-managed profiles, no auth account)
-- =========================================
create table public.children (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  date_of_birth date,
  current_interests text,
  created_at timestamptz not null default now()
);

create index children_owner_user_id_idx on public.children (owner_user_id);

-- =========================================
-- materials (saved "what I have on hand" inventory)
-- =========================================
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index materials_owner_user_id_idx on public.materials (owner_user_id);

-- =========================================
-- generated_activities
-- =========================================
create table public.generated_activities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  steps text[] not null default '{}',
  materials_used text[] not null default '{}',
  reflection_prompts text[] not null default '{}',
  age_range text,
  duration_minutes int,
  energy_level text check (energy_level in ('calm','moderate','high')),
  group_size_fit text check (group_size_fit in ('solo','small_group','whole_group')),
  generation_mode text not null check (generation_mode in ('materials','time','outcome','interest','surprise_me')),
  created_at timestamptz not null default now()
);

create index generated_activities_owner_user_id_idx on public.generated_activities (owner_user_id);

-- =========================================
-- activity_eylf_links
-- =========================================
create table public.activity_eylf_links (
  activity_id uuid not null references public.generated_activities(id) on delete cascade,
  eylf_outcome_id uuid not null references public.eylf_outcomes(id) on delete cascade,
  primary key (activity_id, eylf_outcome_id)
);

-- =========================================
-- observations
-- =========================================
create table public.observations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  activity_id uuid references public.generated_activities(id) on delete set null,
  note_text text not null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index observations_owner_user_id_idx on public.observations (owner_user_id);
create index observations_child_id_idx on public.observations (child_id);

-- =========================================
-- observation_eylf_links
-- =========================================
create table public.observation_eylf_links (
  observation_id uuid not null references public.observations(id) on delete cascade,
  eylf_outcome_id uuid not null references public.eylf_outcomes(id) on delete cascade,
  primary key (observation_id, eylf_outcome_id)
);

-- =========================================
-- RLS
-- =========================================
alter table public.eylf_outcomes enable row level security;
alter table public.children enable row level security;
alter table public.materials enable row level security;
alter table public.generated_activities enable row level security;
alter table public.activity_eylf_links enable row level security;
alter table public.observations enable row level security;
alter table public.observation_eylf_links enable row level security;

-- eylf_outcomes: readable by all authenticated users, writable only via migration
create policy "Authenticated users can read EYLF outcomes"
  on public.eylf_outcomes for select
  to authenticated
  using (true);

-- children
create policy "Owner can view own children" on public.children for select using (owner_user_id = auth.uid());
create policy "Owner can insert own children" on public.children for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own children" on public.children for update using (owner_user_id = auth.uid());
create policy "Owner can delete own children" on public.children for delete using (owner_user_id = auth.uid());

-- materials
create policy "Owner can view own materials" on public.materials for select using (owner_user_id = auth.uid());
create policy "Owner can insert own materials" on public.materials for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own materials" on public.materials for update using (owner_user_id = auth.uid());
create policy "Owner can delete own materials" on public.materials for delete using (owner_user_id = auth.uid());

-- generated_activities
create policy "Owner can view own activities" on public.generated_activities for select using (owner_user_id = auth.uid());
create policy "Owner can insert own activities" on public.generated_activities for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own activities" on public.generated_activities for update using (owner_user_id = auth.uid());
create policy "Owner can delete own activities" on public.generated_activities for delete using (owner_user_id = auth.uid());

-- activity_eylf_links: gated through ownership of the parent activity
create policy "Owner can view own activity links" on public.activity_eylf_links for select
  using (exists (select 1 from public.generated_activities a where a.id = activity_id and a.owner_user_id = auth.uid()));
create policy "Owner can insert own activity links" on public.activity_eylf_links for insert
  with check (exists (select 1 from public.generated_activities a where a.id = activity_id and a.owner_user_id = auth.uid()));
create policy "Owner can delete own activity links" on public.activity_eylf_links for delete
  using (exists (select 1 from public.generated_activities a where a.id = activity_id and a.owner_user_id = auth.uid()));

-- observations
create policy "Owner can view own observations" on public.observations for select using (owner_user_id = auth.uid());
create policy "Owner can insert own observations" on public.observations for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own observations" on public.observations for update using (owner_user_id = auth.uid());
create policy "Owner can delete own observations" on public.observations for delete using (owner_user_id = auth.uid());

-- observation_eylf_links
create policy "Owner can view own observation links" on public.observation_eylf_links for select
  using (exists (select 1 from public.observations o where o.id = observation_id and o.owner_user_id = auth.uid()));
create policy "Owner can insert own observation links" on public.observation_eylf_links for insert
  with check (exists (select 1 from public.observations o where o.id = observation_id and o.owner_user_id = auth.uid()));
create policy "Owner can delete own observation links" on public.observation_eylf_links for delete
  using (exists (select 1 from public.observations o where o.id = observation_id and o.owner_user_id = auth.uid()));

-- =========================================
-- Seed EYLF V2.0 outcomes (official wording)
-- =========================================
insert into public.eylf_outcomes (code, outcome_number, outcome_title, sub_outcome_text) values
('1.1', 1, 'Children have a strong sense of identity', 'Children feel safe, secure and supported'),
('1.2', 1, 'Children have a strong sense of identity', 'Children develop their emerging autonomy, inter-dependence, resilience and agency'),
('1.3', 1, 'Children have a strong sense of identity', 'Children develop knowledgeable, confident self-identities and a positive sense of self-worth'),
('1.4', 1, 'Children have a strong sense of identity', 'Children learn to interact in relation to others with care, empathy and respect'),
('2.1', 2, 'Children are connected with and contribute to their world', 'Children develop a sense of connectedness to groups and communities and an understanding of their reciprocal rights and responsibilities'),
('2.2', 2, 'Children are connected with and contribute to their world', 'Children respond to diversity with respect'),
('2.3', 2, 'Children are connected with and contribute to their world', 'Children become aware of fairness'),
('2.4', 2, 'Children are connected with and contribute to their world', 'Children become socially responsible and show respect for the environment'),
('3.1', 3, 'Children have a strong sense of wellbeing', 'Children become strong in their social, emotional and mental wellbeing'),
('3.2', 3, 'Children have a strong sense of wellbeing', 'Children become strong in their physical learning and wellbeing'),
('3.3', 3, 'Children have a strong sense of wellbeing', 'Children are aware of and develop strategies to support their own mental and physical health and personal safety'),
('4.1', 4, 'Children are confident and involved learners', 'Children develop a growth mindset and learning dispositions such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity'),
('4.2', 4, 'Children are confident and involved learners', 'Children develop a range of learning and thinking skills and processes such as problem-solving, inquiry, experimentation, hypothesising, researching and investigating'),
('4.3', 4, 'Children are confident and involved learners', 'Children transfer and adapt what they have learned from one context to another'),
('4.4', 4, 'Children are confident and involved learners', 'Children resource their own learning through connecting with people, places, technologies and natural and processed materials'),
('5.1', 5, 'Children are effective communicators', 'Children interact verbally and non-verbally with others for a range of purposes'),
('5.2', 5, 'Children are effective communicators', 'Children engage with a range of texts and gain meaning from these texts'),
('5.3', 5, 'Children are effective communicators', 'Children express ideas and make meaning using a range of media'),
('5.4', 5, 'Children are effective communicators', 'Children begin to understand how symbols and pattern systems work'),
('5.5', 5, 'Children are effective communicators', 'Children use digital technologies and media to access information, investigate ideas and represent their thinking');
