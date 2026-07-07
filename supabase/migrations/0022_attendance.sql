-- Attendance register: one record per child per day per service.
-- status tracks the child's current state for that day.
-- Absence of a record = not yet marked for that day.

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  date date not null,
  status text not null check (status in ('absent', 'signed_in', 'signed_out')),
  signed_in_at timestamptz,
  signed_in_by text,      -- free text: name of person who dropped the child off
  signed_out_at timestamptz,
  signed_out_by text,     -- free text: name of authorised person who picked up
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, child_id, date)
);

alter table public.attendance_records enable row level security;

-- Any active staff member can view, create, and update attendance records for their service.
create policy "Active staff can manage attendance records"
  on public.attendance_records
  for all
  using (public.has_service_role(owner_user_id, 'staff'))
  with check (public.has_service_role(owner_user_id, 'staff'));

-- Index for the common query: all records for a service on a given date.
create index attendance_records_owner_date_idx
  on public.attendance_records (owner_user_id, date);
