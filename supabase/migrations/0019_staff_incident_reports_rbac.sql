-- staff_incident_reports needed a materially different policy shape from
-- the mechanical rewrite in 0018 (author/subject carve-outs), kept in its
-- own file. Depends on has_service_role() from 0016.
alter table public.staff_incident_reports
  add column created_by_user_id uuid references auth.users(id) on delete set null,
  add column subject_user_id uuid references auth.users(id) on delete set null;

-- Backfill: every existing row's author is, definitionally, the sole
-- existing Director (no other staff existed when these rows were created).
update public.staff_incident_reports set created_by_user_id = owner_user_id where created_by_user_id is null;

drop policy "Owner can view own staff incident reports" on public.staff_incident_reports;
drop policy "Owner can insert own staff incident reports" on public.staff_incident_reports;
drop policy "Owner can update own staff incident reports" on public.staff_incident_reports;
drop policy "Owner can delete own staff incident reports" on public.staff_incident_reports;

-- Author/subject access also requires they hold (or once held) a real
-- membership row for this exact service -- a bare auth.uid() match with no
-- service scoping at all would let ANY authenticated user query the table
-- by guessing/matching a subject_user_id. The exists(...) below scopes to
-- "ever had a membership row here" (any status), not "currently active",
-- so a removed staff member can still see a report they're the subject/
-- author of (their own employment history), but a stranger never can.
create policy "Director/2IC or report author/subject can view staff incident reports"
  on public.staff_incident_reports for select
  using (
    public.has_service_role(owner_user_id, '2ic')
    or (
      (created_by_user_id = auth.uid() or subject_user_id = auth.uid())
      and exists (
        select 1 from public.staff_memberships sm join public.services s on s.id = sm.service_id
        where s.director_user_id = owner_user_id and sm.user_id = auth.uid()
      )
    )
  );

create policy "Any active staff member can file a staff incident report"
  on public.staff_incident_reports for insert
  with check (public.has_service_role(owner_user_id, 'staff') and created_by_user_id = auth.uid());

create policy "Director/2IC or original author within 48h can update staff incident report"
  on public.staff_incident_reports for update
  using (
    public.has_service_role(owner_user_id, '2ic')
    or (created_by_user_id = auth.uid() and created_at > now() - interval '48 hours')
  );

create policy "Director only can delete staff incident report"
  on public.staff_incident_reports for delete using (public.has_service_role(owner_user_id, 'director'));
