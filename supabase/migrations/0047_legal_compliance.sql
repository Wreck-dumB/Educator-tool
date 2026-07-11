-- ─────────────────────────────────────────────────────────────────────────────
-- 0047_legal_compliance.sql
-- Terms acceptance tracking + append-only audit log for sensitive record access
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Terms acceptance ──────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;  -- tracks which version was accepted

-- Security-definer so the app doesn't need an UPDATE policy on profiles.
-- Only sets terms_accepted_at once (immutable after first acceptance).
create or replace function public.accept_terms(_version text default '1.0')
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set terms_accepted_at = now(), terms_version = _version
  where id = auth.uid() and terms_accepted_at is null;
end;
$$;

grant execute on function public.accept_terms(text) to authenticated;

-- ── Audit log ─────────────────────────────────────────────────────────────────
-- Append-only record of who accessed sensitive records and when.
-- Covers: child incident reports, staff incident reports, immunisation records,
--         child documents, permission slip signatures.

create table public.audit_log (
  id            uuid        primary key default gen_random_uuid(),
  owner_user_id uuid        not null references auth.users(id) on delete cascade,
  actor_user_id uuid        not null references auth.users(id) on delete cascade,
  action        text        not null check (char_length(action) between 1 and 100),
  target_type   text,       -- e.g. 'child_incident_report', 'child_record'
  target_id     uuid,       -- the row that was accessed
  target_label  text,       -- human-readable hint (e.g. child's first name)
  created_at    timestamptz not null default now()
);

create index audit_log_owner_created_idx on public.audit_log (owner_user_id, created_at desc);
create index audit_log_actor_idx         on public.audit_log (actor_user_id);

alter table public.audit_log enable row level security;

-- Directors see their whole service's log.
create policy "Director can view own service audit log"
  on public.audit_log for select
  using (public.has_service_role(owner_user_id, 'director'));

-- Any active staff member can write log entries for their own service,
-- and the entry must record themselves as the actor (no impersonation).
create policy "Active staff can insert audit log entries"
  on public.audit_log for insert
  with check (
    actor_user_id = auth.uid()
    and public.has_service_role(owner_user_id, 'staff')
  );

-- No UPDATE or DELETE policy — audit log is permanently append-only.
-- A malicious actor who gained DB access could still truncate the table,
-- but no app-level code path can ever modify or erase an entry.
