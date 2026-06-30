-- permission_slips moves from "the educator who created it" to "2IC+ of
-- the service that owns it" -- staff can view campaigns, only 2IC+ can
-- create/edit, only the Director can delete. _versions/_targets/
-- _signatures and every parent-facing policy are untouched: they key off
-- permission_slips.id / educator_user_id / is_linked_parent(), none of
-- which change meaning here. Depends on has_service_role() from 0016.
alter table public.permission_slips add column created_by_user_id uuid references auth.users(id) on delete set null;
update public.permission_slips set created_by_user_id = educator_user_id where created_by_user_id is null;

drop policy "Educator can manage own slips" on public.permission_slips;

create policy "Staff can view service permission slips" on public.permission_slips for select
  using (public.has_service_role(educator_user_id, 'staff'));
create policy "2IC+ can create service permission slips" on public.permission_slips for insert
  with check (public.has_service_role(educator_user_id, '2ic') and created_by_user_id = auth.uid());
create policy "2IC+ can update service permission slips" on public.permission_slips for update
  using (public.has_service_role(educator_user_id, '2ic'));
create policy "Director only can delete service permission slips" on public.permission_slips for delete
  using (public.has_service_role(educator_user_id, 'director'));
