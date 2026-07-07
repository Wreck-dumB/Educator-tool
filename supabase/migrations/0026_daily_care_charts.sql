create table if not exists public.daily_sleep (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date date not null,
  sleep_start time not null,
  sleep_end time,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.daily_sleep enable row level security;
create policy "Staff can manage daily sleep" on public.daily_sleep for all
  using (has_service_role(owner_user_id, 'staff'))
  with check (has_service_role(owner_user_id, 'staff'));

create table if not exists public.daily_food (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','morning_tea','lunch','afternoon_tea','late_snack','other')),
  food_offered text not null,
  amount_eaten text not null default 'all' check (amount_eaten in ('all','most','half','little','none','na')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.daily_food enable row level security;
create policy "Staff can manage daily food" on public.daily_food for all
  using (has_service_role(owner_user_id, 'staff'))
  with check (has_service_role(owner_user_id, 'staff'));

create table if not exists public.daily_nappy (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date date not null,
  changed_at time not null,
  nappy_type text not null check (nappy_type in ('wet','dirty','both','dry','na')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.daily_nappy enable row level security;
create policy "Staff can manage daily nappy" on public.daily_nappy for all
  using (has_service_role(owner_user_id, 'staff'))
  with check (has_service_role(owner_user_id, 'staff'));
