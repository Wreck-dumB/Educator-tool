-- Mechanical RBAC rewrite: every owner_user_id-gated table's 4 (or fewer,
-- for link tables) "Owner can ..." policies are dropped and replaced with
-- has_service_role() checks at the threshold from the permission matrix.
-- Depends on has_service_role() from 0016. Does not touch
-- staff_incident_reports or permission_slips - those get their own
-- migrations (0019, 0020) because they need new columns first.
--
-- Thresholds: 'staff' = any active staff member (day-to-day operational
-- tables); '2ic' = 2IC or Director only (governance/write-restricted);
-- 'director' = Director only (deletes of governance documents).

-- =========================================
-- children (staff: all 4)
-- =========================================
drop policy "Owner can view own children" on public.children;
drop policy "Owner can insert own children" on public.children;
drop policy "Owner can update own children" on public.children;
drop policy "Owner can delete own children" on public.children;

create policy "Staff can view service children" on public.children for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service children" on public.children for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service children" on public.children for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service children" on public.children for delete using (public.has_service_role(owner_user_id, 'staff'));
-- "Linked parent can view linked child" (0008) is untouched -- different policy, still references is_linked_parent().

-- =========================================
-- materials (staff: all 4)
-- =========================================
drop policy "Owner can view own materials" on public.materials;
drop policy "Owner can insert own materials" on public.materials;
drop policy "Owner can update own materials" on public.materials;
drop policy "Owner can delete own materials" on public.materials;

create policy "Staff can view service materials" on public.materials for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service materials" on public.materials for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service materials" on public.materials for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service materials" on public.materials for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- generated_activities (staff: all 4)
-- =========================================
drop policy "Owner can view own activities" on public.generated_activities;
drop policy "Owner can insert own activities" on public.generated_activities;
drop policy "Owner can update own activities" on public.generated_activities;
drop policy "Owner can delete own activities" on public.generated_activities;

create policy "Staff can view service activities" on public.generated_activities for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service activities" on public.generated_activities for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service activities" on public.generated_activities for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service activities" on public.generated_activities for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- activity_eylf_links (gated through parent activity's owner_user_id)
-- =========================================
drop policy "Owner can view own activity links" on public.activity_eylf_links;
drop policy "Owner can insert own activity links" on public.activity_eylf_links;
drop policy "Owner can delete own activity links" on public.activity_eylf_links;

create policy "Staff can view service activity links" on public.activity_eylf_links for select
  using (exists (select 1 from public.generated_activities a where a.id = activity_id and public.has_service_role(a.owner_user_id, 'staff')));
create policy "Staff can insert service activity links" on public.activity_eylf_links for insert
  with check (exists (select 1 from public.generated_activities a where a.id = activity_id and public.has_service_role(a.owner_user_id, 'staff')));
create policy "Staff can delete service activity links" on public.activity_eylf_links for delete
  using (exists (select 1 from public.generated_activities a where a.id = activity_id and public.has_service_role(a.owner_user_id, 'staff')));

-- =========================================
-- observations (staff: all 4)
-- =========================================
drop policy "Owner can view own observations" on public.observations;
drop policy "Owner can insert own observations" on public.observations;
drop policy "Owner can update own observations" on public.observations;
drop policy "Owner can delete own observations" on public.observations;

create policy "Staff can view service observations" on public.observations for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service observations" on public.observations for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service observations" on public.observations for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service observations" on public.observations for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- observation_eylf_links (gated through parent observation's owner_user_id)
-- =========================================
drop policy "Owner can view own observation links" on public.observation_eylf_links;
drop policy "Owner can insert own observation links" on public.observation_eylf_links;
drop policy "Owner can delete own observation links" on public.observation_eylf_links;

create policy "Staff can view service observation links" on public.observation_eylf_links for select
  using (exists (select 1 from public.observations o where o.id = observation_id and public.has_service_role(o.owner_user_id, 'staff')));
create policy "Staff can insert service observation links" on public.observation_eylf_links for insert
  with check (exists (select 1 from public.observations o where o.id = observation_id and public.has_service_role(o.owner_user_id, 'staff')));
create policy "Staff can delete service observation links" on public.observation_eylf_links for delete
  using (exists (select 1 from public.observations o where o.id = observation_id and public.has_service_role(o.owner_user_id, 'staff')));

-- =========================================
-- risk_assessments (staff: all 4 -- operational, tied to a specific
-- activity, not a governance document)
-- =========================================
drop policy "Owner can view own risk assessments" on public.risk_assessments;
drop policy "Owner can insert own risk assessments" on public.risk_assessments;
drop policy "Owner can update own risk assessments" on public.risk_assessments;
drop policy "Owner can delete own risk assessments" on public.risk_assessments;

create policy "Staff can view service risk assessments" on public.risk_assessments for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service risk assessments" on public.risk_assessments for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service risk assessments" on public.risk_assessments for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service risk assessments" on public.risk_assessments for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- safe_work_procedures (staff read, 2ic write -- governance-adjacent)
-- =========================================
drop policy "Owner can view own safe work procedures" on public.safe_work_procedures;
drop policy "Owner can insert own safe work procedures" on public.safe_work_procedures;
drop policy "Owner can update own safe work procedures" on public.safe_work_procedures;
drop policy "Owner can delete own safe work procedures" on public.safe_work_procedures;

create policy "Staff can view service safe work procedures" on public.safe_work_procedures for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can insert service safe work procedures" on public.safe_work_procedures for insert with check (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can update service safe work procedures" on public.safe_work_procedures for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can delete service safe work procedures" on public.safe_work_procedures for delete using (public.has_service_role(owner_user_id, '2ic'));

-- =========================================
-- policies (staff read, 2ic write)
-- =========================================
drop policy "Owner can view own policies" on public.policies;
drop policy "Owner can insert own policies" on public.policies;
drop policy "Owner can update own policies" on public.policies;
drop policy "Owner can delete own policies" on public.policies;

create policy "Staff can view service policies" on public.policies for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can insert service policies" on public.policies for insert with check (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can update service policies" on public.policies for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can delete service policies" on public.policies for delete using (public.has_service_role(owner_user_id, '2ic'));

-- =========================================
-- form_templates (staff read, 2ic write)
-- =========================================
drop policy "Owner can view own form templates" on public.form_templates;
drop policy "Owner can insert own form templates" on public.form_templates;
drop policy "Owner can update own form templates" on public.form_templates;
drop policy "Owner can delete own form templates" on public.form_templates;

create policy "Staff can view service form templates" on public.form_templates for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can insert service form templates" on public.form_templates for insert with check (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can update service form templates" on public.form_templates for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can delete service form templates" on public.form_templates for delete using (public.has_service_role(owner_user_id, '2ic'));

-- =========================================
-- quality_improvement_plans (staff read, 2ic write, director delete)
-- =========================================
drop policy "Owner can view own QIP" on public.quality_improvement_plans;
drop policy "Owner can insert own QIP" on public.quality_improvement_plans;
drop policy "Owner can update own QIP" on public.quality_improvement_plans;
drop policy "Owner can delete own QIP" on public.quality_improvement_plans;

create policy "Staff can view service QIP" on public.quality_improvement_plans for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can insert service QIP" on public.quality_improvement_plans for insert with check (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can update service QIP" on public.quality_improvement_plans for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "Director only can delete service QIP" on public.quality_improvement_plans for delete using (public.has_service_role(owner_user_id, 'director'));

-- =========================================
-- qip_items (staff read, 2ic write, director delete)
-- =========================================
drop policy "Owner can view own QIP items" on public.qip_items;
drop policy "Owner can insert own QIP items" on public.qip_items;
drop policy "Owner can update own QIP items" on public.qip_items;
drop policy "Owner can delete own QIP items" on public.qip_items;

create policy "Staff can view service QIP items" on public.qip_items for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can insert service QIP items" on public.qip_items for insert with check (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can update service QIP items" on public.qip_items for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "Director only can delete service QIP items" on public.qip_items for delete using (public.has_service_role(owner_user_id, 'director'));

-- =========================================
-- child_contacts (staff read/insert, 2ic update/delete -- who's authorised
-- to collect a child is more sensitive to change than to view)
-- =========================================
drop policy "Owner can view own child contacts" on public.child_contacts;
drop policy "Owner can insert own child contacts" on public.child_contacts;
drop policy "Owner can update own child contacts" on public.child_contacts;
drop policy "Owner can delete own child contacts" on public.child_contacts;

create policy "Staff can view service child contacts" on public.child_contacts for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service child contacts" on public.child_contacts for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "2IC+ can update service child contacts" on public.child_contacts for update using (public.has_service_role(owner_user_id, '2ic'));
create policy "2IC+ can delete service child contacts" on public.child_contacts for delete using (public.has_service_role(owner_user_id, '2ic'));

-- =========================================
-- child_incident_reports (Reg 87 -- staff can read/file; author can
-- update their own; 2ic+ on others'; director-only delete)
-- =========================================
drop policy "Owner can view own child incident reports" on public.child_incident_reports;
drop policy "Owner can insert own child incident reports" on public.child_incident_reports;
drop policy "Owner can update own child incident reports" on public.child_incident_reports;
drop policy "Owner can delete own child incident reports" on public.child_incident_reports;

alter table public.child_incident_reports add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;
update public.child_incident_reports set created_by_user_id = owner_user_id where created_by_user_id is null;

create policy "Staff can view service child incident reports" on public.child_incident_reports for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can file service child incident reports" on public.child_incident_reports for insert
  with check (public.has_service_role(owner_user_id, 'staff') and created_by_user_id = auth.uid());
create policy "Author or 2IC+ can update child incident report" on public.child_incident_reports for update
  using (public.has_service_role(owner_user_id, '2ic') or created_by_user_id = auth.uid());
create policy "Director only can delete child incident report" on public.child_incident_reports for delete using (public.has_service_role(owner_user_id, 'director'));

-- =========================================
-- recipes (staff: all 4)
-- =========================================
drop policy "Owner can view own recipes" on public.recipes;
drop policy "Owner can insert own recipes" on public.recipes;
drop policy "Owner can update own recipes" on public.recipes;
drop policy "Owner can delete own recipes" on public.recipes;

create policy "Staff can view service recipes" on public.recipes for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service recipes" on public.recipes for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service recipes" on public.recipes for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service recipes" on public.recipes for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- programs (staff: all 4)
-- =========================================
drop policy "Owner can view own programs" on public.programs;
drop policy "Owner can insert own programs" on public.programs;
drop policy "Owner can update own programs" on public.programs;
drop policy "Owner can delete own programs" on public.programs;

create policy "Staff can view service programs" on public.programs for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service programs" on public.programs for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service programs" on public.programs for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service programs" on public.programs for delete using (public.has_service_role(owner_user_id, 'staff'));

-- =========================================
-- program_entries (gated through parent program's owner_user_id)
-- =========================================
drop policy "Owner can view own program entries" on public.program_entries;
drop policy "Owner can insert own program entries" on public.program_entries;
drop policy "Owner can update own program entries" on public.program_entries;
drop policy "Owner can delete own program entries" on public.program_entries;

create policy "Staff can view service program entries" on public.program_entries for select
  using (exists (select 1 from public.programs p where p.id = program_id and public.has_service_role(p.owner_user_id, 'staff')));
create policy "Staff can insert service program entries" on public.program_entries for insert
  with check (exists (select 1 from public.programs p where p.id = program_id and public.has_service_role(p.owner_user_id, 'staff')));
create policy "Staff can update service program entries" on public.program_entries for update
  using (exists (select 1 from public.programs p where p.id = program_id and public.has_service_role(p.owner_user_id, 'staff')));
create policy "Staff can delete service program entries" on public.program_entries for delete
  using (exists (select 1 from public.programs p where p.id = program_id and public.has_service_role(p.owner_user_id, 'staff')));
