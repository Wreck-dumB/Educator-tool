create table public.child_follow_ups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  observation_id uuid references public.observations(id) on delete set null,
  note text not null check (char_length(note) >= 1),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.child_follow_ups enable row level security;

create policy "Staff can view service follow-ups" on public.child_follow_ups for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Staff can create follow-ups" on public.child_follow_ups for insert
  with check (public.has_service_role(owner_user_id, 'staff'));

create policy "Staff can update follow-ups" on public.child_follow_ups for update
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "2IC+ can delete follow-ups" on public.child_follow_ups for delete
  using (public.has_service_role(owner_user_id, '2ic'));

create index child_follow_ups_child_id_idx on public.child_follow_ups (child_id);
create index child_follow_ups_owner_status_idx on public.child_follow_ups (owner_user_id, status);
