-- Security fix: accept_staff_invite() and accept_child_invite() validated that
-- an invite token was pending/unexpired, but never checked that the account
-- redeeming it actually belonged to the email the invite was sent to. Anyone
-- who obtained a valid token (forwarded email, shared link, screenshot) could
-- redeem someone else's invite with their own account -- joining another
-- centre as staff, or linking to another family's child in the parent
-- portal, with real read access to medical/behavioural records. Confirmed via
-- a live exploit against a throwaway test tenant, cleaned up afterwards; no
-- real accounts were affected. Fix: require the redeeming user's auth email
-- to case-insensitively match the invite's invited_email before proceeding.

create or replace function public.accept_staff_invite(_token uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _invite record;
  _membership_id uuid;
  _caller_email text;
begin
  select * into _invite from public.staff_invites
  where token = _token and status = 'pending' and expires_at > now();
  if not found then raise exception 'Invite not found, expired, or already used'; end if;

  select email into _caller_email from auth.users where id = auth.uid();
  if _caller_email is null or lower(_caller_email) != lower(_invite.invited_email) then
    raise exception 'This invite was sent to a different email address. Log in with that email, or ask for a new invite.';
  end if;

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

create or replace function public.accept_child_invite(_token uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _invite record;
  _link_id uuid;
  _link record;
  _caller_email text;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'parent'
  ) then
    raise exception 'Only parent accounts can accept child invites';
  end if;

  select * into _invite
  from public.child_invites
  where token = _token and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invite not found, expired, or already used';
  end if;

  select email into _caller_email from auth.users where id = auth.uid();
  if _caller_email is null or lower(_caller_email) != lower(_invite.invited_email) then
    raise exception 'This invite was sent to a different email address. Log in with that email, or ask for a new invite.';
  end if;

  insert into public.parent_child_links
    (parent_user_id, child_id, educator_user_id, created_via_invite_id)
  values
    (auth.uid(), _invite.child_id, _invite.educator_user_id, _invite.id)
  on conflict (parent_user_id, child_id) do nothing
  returning id into _link_id;

  if _link_id is null then
    select id into _link_id
    from public.parent_child_links
    where parent_user_id = auth.uid() and child_id = _invite.child_id;
  end if;

  if _link_id is not null then
    insert into public.conversations
      (parent_child_link_id, educator_user_id, parent_user_id, child_id)
    values
      (_link_id, _invite.educator_user_id, auth.uid(), _invite.child_id)
    on conflict (parent_child_link_id) do nothing;
  end if;

  update public.child_invites set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = _invite.id;

  return _link_id;
end;
$$;

grant execute on function public.accept_child_invite(uuid) to authenticated;
