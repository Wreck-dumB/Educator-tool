-- Child enrolled days: which weekdays each child normally attends
-- day_of_week: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
create table public.child_attendance_days (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 4),
  session_type text not null default 'full_day'
    check (session_type in ('full_day', 'morning', 'afternoon')),
  unique (child_id, day_of_week)
);
alter table public.child_attendance_days enable row level security;
create policy "Staff can select attendance days"
  on public.child_attendance_days for select
  using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert attendance days"
  on public.child_attendance_days for insert
  with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update attendance days"
  on public.child_attendance_days for update
  using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete attendance days"
  on public.child_attendance_days for delete
  using (public.has_service_role(owner_user_id, 'staff'));

create index child_attendance_days_child_idx on public.child_attendance_days (child_id);
create index child_attendance_days_owner_dow_idx on public.child_attendance_days (owner_user_id, day_of_week);

-- Daily routines: saved time-blocked day plans and reusable templates
-- blocks JSONB array: [{id, time, title, duration_minutes, notes, activity_id, type}]
create table public.daily_routines (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date,                                       -- null = template; set = specific day
  room_id uuid references public.rooms(id) on delete set null,
  blocks jsonb not null default '[]',
  is_template boolean not null default false,
  focus_topic text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.daily_routines enable row level security;
create policy "Staff can select daily routines"
  on public.daily_routines for select
  using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert daily routines"
  on public.daily_routines for insert
  with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update daily routines"
  on public.daily_routines for update
  using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can delete daily routines"
  on public.daily_routines for delete
  using (public.has_service_role(owner_user_id, '2ic'));

create index daily_routines_owner_date_idx on public.daily_routines (owner_user_id, date);
