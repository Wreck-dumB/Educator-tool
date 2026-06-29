-- Child-friendly recipe generator, mirroring the activity generator's
-- pattern (generate candidates, review, save). Safety-conscious by design:
-- allergens_present and choking_hazard_notes are always shown to the
-- educator, never hidden - but this is a draft for the educator's own
-- judgement, not a substitute for checking each child's actual enrolment/
-- allergy record before serving (the generator doesn't know which
-- specific children will eat a given batch).
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  prep_time_minutes int,
  servings int,
  age_range text,
  dietary_tags text[] not null default '{}',
  allergens_present text[] not null default '{}',
  choking_hazard_notes text,
  your_input text not null,
  created_at timestamptz not null default now()
);

create index recipes_owner_user_id_idx on public.recipes (owner_user_id);

alter table public.recipes enable row level security;

create policy "Owner can view own recipes" on public.recipes for select using (owner_user_id = auth.uid());
create policy "Owner can insert own recipes" on public.recipes for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own recipes" on public.recipes for update using (owner_user_id = auth.uid());
create policy "Owner can delete own recipes" on public.recipes for delete using (owner_user_id = auth.uid());
