-- Fixes a real, reproducible bug found during the 2026-08-18 QA pass: creating
-- ANY permission slip fails with Postgres 42P17 "infinite recursion detected
-- in policy for relation permission_slips" — 100% repro, 0% of the feature
-- working (excursion consent, photo/media consent, medication authorisation).
--
-- Root cause: permission_slips' "Linked parent can view slip sent to their
-- child" policy (0013) does a raw EXISTS subquery against
-- permission_slip_targets, and permission_slip_targets' "Educator can manage
-- targets for own slips" policy (0013, untouched by 0020) does a raw EXISTS
-- subquery back against permission_slips. Postgres must apply each table's
-- own RLS policies while evaluating a subquery against it, so A's policy
-- needs B's policy evaluated, which needs A's policy evaluated again — a
-- genuine circular dependency, not a transient/query-shape issue.
--
-- Fix pattern: exactly what has_service_role() (0016) and is_linked_parent()
-- (0008) already do elsewhere in this schema — move the cross-table read
-- inside a SECURITY DEFINER function. A security definer function's internal
-- queries are NOT subject to the caller's RLS re-evaluation of the OTHER
-- table, so neither policy needs to re-enter the other's policy stack.
--
-- Also fixes a related, previously-latent correctness bug surfaced while
-- tracing this: permission_slip_targets/_versions/_signatures still gate on
-- the literal `educator_user_id = auth.uid()` from before 0020's RBAC
-- rewrite, which only the Director's own auth.uid() ever equals — 0020
-- explicitly widened permission_slips itself to let 2IC+ create slips
-- on the service's behalf (educator_user_id = the Director's id, NOT the
-- 2IC's own uid), but never updated these sibling tables to match, so a 2IC
-- could pass permission_slips' own INSERT check yet be blocked from ever
-- inserting the slip's version/targets rows. Rewriting these to
-- has_service_role() brings them in line with 0020's intended model.

-- Bypasses RLS internally (owned by a bypassrls-capable role, same as every
-- other security-definer helper in this schema) so callers never re-trigger
-- permission_slips' own SELECT policies while resolving its owner.
create or replace function public.permission_slip_owner(_slip_id uuid)
returns uuid
language sql security definer stable
set search_path = public
as $$
  select educator_user_id from public.permission_slips where id = _slip_id;
$$;

grant execute on function public.permission_slip_owner(uuid) to authenticated;

-- Same bypass, for the other direction of the old circular reference: reads
-- permission_slip_targets directly rather than via a plain EXISTS subquery
-- that would otherwise re-enter permission_slip_targets' own RLS policies.
create or replace function public.permission_slip_sent_to_linked_child(_slip_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.permission_slip_targets t
    where t.slip_id = _slip_id and public.is_linked_parent(t.child_id)
  );
$$;

grant execute on function public.permission_slip_sent_to_linked_child(uuid) to authenticated;

-- permission_slips: only this one policy participated in the cycle.
drop policy "Linked parent can view slip sent to their child" on public.permission_slips;
create policy "Linked parent can view slip sent to their child" on public.permission_slips for select
  using (public.permission_slip_sent_to_linked_child(id));

-- permission_slip_targets: replace the single recursive "for all" policy
-- with role-graded policies mirroring 0020's model for the parent slip
-- (staff view, 2IC+ create/edit, director delete). The pre-existing
-- "Linked parent can view own child's target" policy is untouched — it
-- never referenced permission_slips and was never part of the cycle.
drop policy "Educator can manage targets for own slips" on public.permission_slip_targets;

create policy "Staff can view service permission slip targets" on public.permission_slip_targets for select
  using (public.has_service_role(public.permission_slip_owner(slip_id), 'staff'));
create policy "2IC+ can insert service permission slip targets" on public.permission_slip_targets for insert
  with check (public.has_service_role(public.permission_slip_owner(slip_id), '2ic'));
create policy "2IC+ can update service permission slip targets" on public.permission_slip_targets for update
  using (public.has_service_role(public.permission_slip_owner(slip_id), '2ic'));
create policy "Director only can delete service permission slip targets" on public.permission_slip_targets for delete
  using (public.has_service_role(public.permission_slip_owner(slip_id), 'director'));

-- permission_slip_versions: not part of the recursion (permission_slips'
-- policies never reference this table), but same 0020-vs-2IC gap as targets
-- above — fixed here for consistency since it's the same feature/root cause.
drop policy "Educator can view own slip versions" on public.permission_slip_versions;
drop policy "Educator can insert versions for own slips" on public.permission_slip_versions;

create policy "Staff can view service slip versions" on public.permission_slip_versions for select
  using (public.has_service_role(public.permission_slip_owner(slip_id), 'staff'));
create policy "2IC+ can insert service slip versions" on public.permission_slip_versions for insert
  with check (public.has_service_role(public.permission_slip_owner(slip_id), '2ic'));
-- (Still no update/delete policy on this table, for anyone — unchanged, versions remain append-only.)

-- permission_slip_signatures: same educator-only view gap as above, view-only
-- (this table's insert/no-update/no-delete policies are parent-signing logic,
-- untouched and unrelated to the staff-role gap).
drop policy "Educator can view signatures for own slips" on public.permission_slip_signatures;
create policy "Staff can view service slip signatures" on public.permission_slip_signatures for select
  using (public.has_service_role(public.permission_slip_owner(slip_id), 'staff'));
