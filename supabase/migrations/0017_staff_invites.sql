-- Staff invite flow, mirroring child_invites/accept_child_invite (0008)
-- with a role ceiling: only the Director can grant 2IC; a 2IC can only
-- invite at 'staff'. Depends on has_service_role() from 0016.
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  invited_role text not null check (invited_role in ('2ic', 'staff')),
  invited_email text not null,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz
);

create index staff_invites_service_id_idx on public.staff_invites (service_id);

alter table public.staff_invites enable row level security;

create policy "2IC+ can view service staff invites" on public.staff_invites for select
  using (exists (select 1 from public.services s where s.id = service_id and public.has_service_role(s.director_user_id, '2ic')));

-- Load-bearing: invited_role can never exceed what the inviter may grant,
-- enforced here, not just hidden in the UI.
create policy "2IC+ can create staff invites within their own grant ceiling" on public.staff_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.services s
      where s.id = service_id
        and (
          (invited_role = 'staff' and public.has_service_role(s.director_user_id, '2ic'))
          or (invited_role = '2ic' and public.has_service_role(s.director_user_id, 'director'))
        )
    )
  );

create policy "2IC+ can revoke service staff invites" on public.staff_invites for update
  using (exists (select 1 from public.services s where s.id = service_id and public.has_service_role(s.director_user_id, '2ic')));

-- Reveals only the inviting service's name + invite status/expiry -- minimal
-- disclosure to whoever already holds the unguessable token, mirroring
-- get_child_invite_preview()'s philosophy.
create or replace function public.get_staff_invite_preview(_token uuid)
returns table (service_name text, invited_role text, status text, expires_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select s.name, si.invited_role, si.status, si.expires_at
  from public.staff_invites si
  join public.services s on s.id = si.service_id
  where si.token = _token;
end;
$$;

grant execute on function public.get_staff_invite_preview(uuid) to authenticated, anon;

create or replace function public.accept_staff_invite(_token uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _invite record;
  _membership_id uuid;
begin
  select * into _invite from public.staff_invites
  where token = _token and status = 'pending' and expires_at > now();
  if not found then raise exception 'Invite not found, expired, or already used'; end if;

  if exists (select 1 from public.staff_memberships where service_id = _invite.service_id and user_id = auth.uid() and status = 'active') then
    raise exception 'You are already an active staff member of this service';
  end if;

  insert into public.staff_memberships (service_id, user_id, role, invited_by)
  values (_invite.service_id, auth.uid(), _invite.invited_role, _invite.invited_by)
  on conflict (service_id, user_id) do update set role = excluded.role, status = 'active', removed_at = null
  returning id into _membership_id;

  update public.staff_invites set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = _invite.id;

  insert into public.profiles (id, role, display_name)
  values (auth.uid(), 'educator', coalesce((select email from auth.users where id = auth.uid()), 'Staff member'))
  on conflict (id) do nothing;

  return _membership_id;
end;
$$;

grant execute on function public.accept_staff_invite(uuid) to authenticated;
