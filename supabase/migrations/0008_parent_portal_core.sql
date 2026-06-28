-- Parent portal, Phase 1: roles + per-child invite + linking only.
-- No observation sharing, messaging, documents, or wall yet - nothing else
-- to expose until this phase is built AND verified with two real test
-- accounts (see the plan file for the verification checklist).
--
-- Security note: SparkPlay's existing data-access helpers (e.g.
-- getChildren()/getChild() in src/lib/supabase/children.ts) trust RLS
-- completely, with zero defense-in-depth filtering in application code.
-- That means RLS here is not one layer of defense, it is the ENTIRE
-- defense - every policy below is written assuming a caller could hit
-- PostgREST directly with a valid parent JWT, bypassing the Next.js app.

-- =========================================
-- profiles - one row per auth user, role set once at signup, never
-- client-updatable afterward (no update policy at all -> default-deny).
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('educator', 'parent')),
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- Deliberately NO update or delete policy: role is immutable post-signup,
-- there is no self-service profile editing in v1.

-- =========================================
-- child_invites - one invite = one child, not a whole family.
-- =========================================
create table public.child_invites (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz
);

create index child_invites_child_id_idx on public.child_invites (child_id);
create index child_invites_educator_user_id_idx on public.child_invites (educator_user_id);

alter table public.child_invites enable row level security;

create policy "Educator can view own invites"
  on public.child_invites for select
  using (educator_user_id = auth.uid());

create policy "Educator can create invites for own children"
  on public.child_invites for insert
  with check (
    educator_user_id = auth.uid()
    and exists (select 1 from public.children c where c.id = child_id and c.owner_user_id = auth.uid())
  );

create policy "Educator can update own invites"
  on public.child_invites for update
  using (educator_user_id = auth.uid());

-- No parent SELECT policy at all -- a pre-acceptance preview goes through
-- get_child_invite_preview() instead (narrow function over broad policy,
-- mirroring the FTP get_invite_preview pattern).

-- =========================================
-- parent_child_links - no client insert/update policy at all; every link
-- is created only via accept_child_invite() below, so token-validity and
-- ownership checks can never be bypassed by a direct client insert.
-- =========================================
create table public.parent_child_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  created_via_invite_id uuid references public.child_invites(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parent_user_id, child_id)
);

create index parent_child_links_parent_user_id_idx on public.parent_child_links (parent_user_id);
create index parent_child_links_child_id_idx on public.parent_child_links (child_id);
create index parent_child_links_educator_user_id_idx on public.parent_child_links (educator_user_id);

alter table public.parent_child_links enable row level security;

create policy "Parent can view own links"
  on public.parent_child_links for select
  using (parent_user_id = auth.uid());

create policy "Educator can view links for own children"
  on public.parent_child_links for select
  using (educator_user_id = auth.uid());

create policy "Educator can delete links for own children"
  on public.parent_child_links for delete
  using (educator_user_id = auth.uid());

-- =========================================
-- Helper and security-definer functions
-- =========================================

create or replace function public.is_linked_parent(_child_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.parent_child_links
    where child_id = _child_id and parent_user_id = auth.uid()
  );
$$;

grant execute on function public.is_linked_parent(uuid) to authenticated;

-- Reveals only the child's first name + invite status/expiry -- minimal
-- disclosure, and only to whoever already holds the unguessable token
-- (handed to them out-of-band by the educator).
create or replace function public.get_child_invite_preview(_token uuid)
returns table (child_first_name text, status text, expires_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select c.first_name, ci.status, ci.expires_at
  from public.child_invites ci
  join public.children c on c.id = ci.child_id
  where ci.token = _token;
end;
$$;

grant execute on function public.get_child_invite_preview(uuid) to authenticated, anon;

-- Only an account explicitly role='parent' may redeem an invite (checked
-- here, not just trusted from signup) -- re-validates status/expiry
-- server-side, never trusts the UI only showed this for a valid invite.
create or replace function public.accept_child_invite(_token uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _invite record;
  _link_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'parent') then
    raise exception 'Only parent accounts can accept child invites';
  end if;

  select * into _invite
  from public.child_invites
  where token = _token and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invite not found, expired, or already used';
  end if;

  insert into public.parent_child_links (parent_user_id, child_id, educator_user_id, created_via_invite_id)
  values (auth.uid(), _invite.child_id, _invite.educator_user_id, _invite.id)
  on conflict (parent_user_id, child_id) do nothing
  returning id into _link_id;

  update public.child_invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = _invite.id;

  return _link_id;
end;
$$;

grant execute on function public.accept_child_invite(uuid) to authenticated;

-- =========================================
-- children: add a parent SELECT, alongside (not replacing) the 4 existing
-- educator policies from 0001. No parent INSERT/UPDATE/DELETE at all.
--
-- NOTE: this grants the linked parent the whole row, including
-- additional_needs (sensitive: disability/family/legal context, added in
-- migration 0005) since Postgres RLS is row-level, not column-level. This
-- was a deliberate decision: additional_needs is information typically
-- originating from the parent themselves, so showing it back to them is
-- appropriate transparency, not new disclosure. Revisit (split into a
-- separate child_internal_notes table with no parent policy) if any
-- educator-only clinical/behavioural shorthand is ever stored there too.
-- =========================================
create policy "Linked parent can view linked child"
  on public.children for select
  using (public.is_linked_parent(id));
