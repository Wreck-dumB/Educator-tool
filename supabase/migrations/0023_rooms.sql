-- Rooms / classrooms: children are assigned to a room, attendance is
-- grouped by room, and ratios are calculated from children's actual ages.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "Active staff can manage rooms"
  on public.rooms for all
  using (public.has_service_role(owner_user_id, 'staff'))
  with check (public.has_service_role(owner_user_id, 'staff'));

-- Which room each child is assigned to (null = unassigned).
alter table public.children
  add column room_id uuid references public.rooms(id) on delete set null;

-- Tracks how many staff are physically present in a room on a given day.
-- Updated via +/- buttons on the attendance register; used to check ratios.
create table public.room_staff_counts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  staff_count int not null default 0 check (staff_count >= 0),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, room_id, date)
);

alter table public.room_staff_counts enable row level security;

create policy "Active staff can manage room staff counts"
  on public.room_staff_counts for all
  using (public.has_service_role(owner_user_id, 'staff'))
  with check (public.has_service_role(owner_user_id, 'staff'));
