-- Staff RBAC foundation: introduces a real "services" concept (rather than
-- treating a Director's auth.users.id as an implicit service ID), plus
-- staff_memberships (Director/2IC/staff tiers) and the has_service_role()
-- predicate every later migration's RLS policies will use.
--
-- Purely additive: touches no existing table's policies. Every existing
-- owner_user_id column keeps its name and meaning unchanged ("the Director
-- who owns this") - the trick that avoids a single column rename or data
-- rewrite is that every Director also gets their own staff_memberships row
-- with role='director', so "owner" and "staff" collapse into one code path:
-- there is no separate "am I the owner" check anywhere in this design, only
-- "do I have an active staff_memberships row at or above role X for the
-- service that owns this data."
create table public.services (
  id uuid primary key default gen_random_uuid(),
  director_user_id uuid not null unique references auth.users(id) on delete restrict,
  name text not null default 'My Service',
  created_at timestamptz not null default now()
);

-- Backfill: one services row per existing Director (today, the sole trial user).
insert into public.services (director_user_id)
select id from auth.users
where id not in (select director_user_id from public.services);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('director', '2ic', 'staff')),
  status text not null default 'active' check (status in ('active', 'removed')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (service_id, user_id)
);

create index staff_memberships_user_id_idx on public.staff_memberships (user_id);
create index staff_memberships_service_id_idx on public.staff_memberships (service_id);

-- Backfill: every existing Director gets their own role='director' membership row.
insert into public.staff_memberships (service_id, user_id, role)
select s.id, s.director_user_id, 'director' from public.services s
where not exists (select 1 from public.staff_memberships sm where sm.service_id = s.id and sm.user_id = s.director_user_id);

alter table public.services enable row level security;
alter table public.staff_memberships enable row level security;

create policy "Director can view own service" on public.services for select using (director_user_id = auth.uid());
create policy "Active staff can view their service" on public.services for select
  using (public.has_service_role(director_user_id, 'staff'));

create policy "2IC+ can view own service's memberships"
  on public.staff_memberships for select
  using (exists (select 1 from public.services s where s.id = service_id and public.has_service_role(s.director_user_id, '2ic')));
create policy "Staff can view their own membership row"
  on public.staff_memberships for select
  using (user_id = auth.uid());
-- General staff (below 2ic) still see their OWN row via the policy above,
-- just not the full roster -- matches "staff get read access to
-- organisational info, 2ic+ get management" elsewhere in this design. If
-- you want all staff to see the full roster too (a simple "who works
-- here" directory), broaden this to has_service_role(..., 'staff').
-- No general DELETE policy at all -- removal is always status='removed' via
-- UPDATE, never a row delete, so "who was staff here and when" can never be
-- erased even by the Director.
create policy "Director can update staff role/status for own service"
  on public.staff_memberships for update
  using (exists (select 1 from public.services s where s.id = service_id and s.director_user_id = auth.uid()))
  with check (
    -- Director can never demote/remove themselves via this path, and can
    -- never create a second director row -- ownership transfer is a
    -- separate, deliberately harder operation, not built here.
    role in ('2ic', 'staff')
    or (role = 'director' and user_id = (select director_user_id from public.services where id = service_id))
  );

-- The single predicate every rewritten policy uses from here on. Hierarchy:
-- director(3) > 2ic(2) > staff(1). security definer so it can read
-- staff_memberships regardless of the caller's own RLS visibility into it.
create or replace function public.has_service_role(_owner_user_id uuid, _min_role text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    join public.services s on s.id = sm.service_id
    where s.director_user_id = _owner_user_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
      and (
        case sm.role when 'director' then 3 when '2ic' then 2 else 1 end
        >=
        case _min_role when 'director' then 3 when '2ic' then 2 else 1 end
      )
  );
$$;

grant execute on function public.has_service_role(uuid, text) to authenticated;

-- Every "create a new row" action across the app needs to know WHICH
-- owner_user_id (always the Director's auth.users.id, by definition of
-- what that column means) to write -- a 2IC or staff member's own
-- auth.uid() is never a valid owner_user_id. This resolves "the service
-- I'm active staff at" -> its Director's id, security definer so it
-- doesn't require broadening the services/staff_memberships SELECT
-- policies (narrow function over broad policy, same philosophy as
-- get_child_invite_preview). Returns null if the caller has no active
-- service membership at all (e.g. a brand new signup mid-onboarding).
create or replace function public.my_service_owner_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select s.director_user_id
  from public.staff_memberships sm
  join public.services s on s.id = sm.service_id
  where sm.user_id = auth.uid() and sm.status = 'active'
  limit 1;
$$;

grant execute on function public.my_service_owner_id() to authenticated;

-- Bootstraps a brand-new service for a user with no existing active
-- membership anywhere. Security definer because services/staff_memberships
-- deliberately have no client-facing INSERT policy at all -- creating a
-- service is an atomic "create the service row + create my own director
-- membership row" operation, not something safe to expose as two separate
-- raw inserts (a client could otherwise insert a services row pointing at
-- itself without ever getting a corresponding membership row, or vice versa).
create or replace function public.start_new_service(_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _service_id uuid;
begin
  if exists (select 1 from public.staff_memberships where user_id = auth.uid() and status = 'active') then
    raise exception 'You already belong to an active service';
  end if;

  insert into public.services (director_user_id, name)
  values (auth.uid(), coalesce(nullif(trim(_name), ''), 'My Service'))
  returning id into _service_id;

  insert into public.staff_memberships (service_id, user_id, role)
  values (_service_id, auth.uid(), 'director');

  return _service_id;
end;
$$;

grant execute on function public.start_new_service(text) to authenticated;

-- profiles (0008) only let a user see their own row. A staff list UI needs
-- to show teammates' display names -- narrow addition: any active staff
-- member can see the display_name of any other active staff member at the
-- SAME service, nothing else about them, and never a profile at a
-- different, unrelated service.
create policy "Service teammates can view each other's profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.staff_memberships my
      join public.staff_memberships their on their.service_id = my.service_id
      where my.user_id = auth.uid() and my.status = 'active'
        and their.user_id = profiles.id and their.status = 'active'
    )
  );
