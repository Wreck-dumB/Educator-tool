-- ─── Medication Administration Log ────────────────────────────────────────────
-- Required by ECSNR Reg 93 and most service's own medication policies.
-- Every administration must be recorded: what, dose, route, when, who gave it,
-- parent authorisation, and ideally a witness.

create table public.medication_administration_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  medication_name text not null,
  dose text not null,
  route text not null check (route in ('oral', 'topical', 'inhaled', 'eye_drops', 'ear_drops', 'nasal', 'injection', 'other')),
  administered_at timestamptz not null default now(),
  administered_by_user_id uuid not null references auth.users(id) on delete cascade,
  -- Parent authorisation
  parent_authorised boolean not null default false,
  authorised_by_name text,
  authorisation_method text check (authorisation_method in ('written_form', 'verbal', 'standing_order', 'health_plan')),
  -- Details
  reason text,
  observations_after text,
  next_dose_due timestamptz,
  -- Witness (best practice)
  witnessed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.medication_administration_log enable row level security;

create policy "Active staff can view medication log"
  on public.medication_administration_log for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Active staff can log medication administration"
  on public.medication_administration_log for insert
  with check (public.has_service_role(owner_user_id, 'staff') and administered_by_user_id = auth.uid());

create policy "Active staff can update medication records"
  on public.medication_administration_log for update
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Director can delete medication records"
  on public.medication_administration_log for delete
  using (public.has_service_role(owner_user_id, 'director'));

create index medication_log_child_idx on public.medication_administration_log (child_id);
create index medication_log_owner_date_idx on public.medication_administration_log (owner_user_id, administered_at desc);


-- ─── Shift Handover Notes ────────────────────────────────────────────────────
-- Replaces the physical handover book. Outgoing shift writes it;
-- incoming shift acknowledges it before starting.

create table public.shift_handover_notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null default current_date,
  shift_type text not null check (shift_type in ('morning', 'afternoon', 'full_day', 'split')),
  written_by_user_id uuid not null references auth.users(id) on delete cascade,
  general_notes text,
  children_notes text,
  medication_summary text,
  incidents_summary text,
  outstanding_tasks text,
  acknowledged_by_user_id uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.shift_handover_notes enable row level security;

create policy "Active staff can view handover notes"
  on public.shift_handover_notes for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Active staff can write handover notes"
  on public.shift_handover_notes for insert
  with check (public.has_service_role(owner_user_id, 'staff') and written_by_user_id = auth.uid());

create policy "Active staff can update handover notes"
  on public.shift_handover_notes for update
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Director can delete handover notes"
  on public.shift_handover_notes for delete
  using (public.has_service_role(owner_user_id, 'director'));

create index handover_notes_owner_date_idx on public.shift_handover_notes (owner_user_id, shift_date desc);


-- ─── Visitor / Volunteer Log ─────────────────────────────────────────────────
-- NQS QA2 and most WHS policies require a visitor register.
-- Records who came in, why, what checks were done, and when they left.

create table public.visitor_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visitor_name text not null,
  visitor_type text not null check (visitor_type in (
    'volunteer', 'contractor', 'delivery', 'government_inspector',
    'student_placement', 'parent_observer', 'other'
  )),
  organisation text,
  purpose_of_visit text not null,
  signed_in_at timestamptz not null default now(),
  signed_out_at timestamptz,
  id_checked boolean not null default false,
  wwcc_checked boolean not null default false,
  wwcc_number text,
  supervised boolean not null default true,
  signed_in_by_user_id uuid not null references auth.users(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.visitor_log enable row level security;

create policy "Active staff can view visitor log"
  on public.visitor_log for select
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Active staff can sign in visitors"
  on public.visitor_log for insert
  with check (public.has_service_role(owner_user_id, 'staff') and signed_in_by_user_id = auth.uid());

create policy "Active staff can update visitor records"
  on public.visitor_log for update
  using (public.has_service_role(owner_user_id, 'staff'));

create policy "Director can delete visitor records"
  on public.visitor_log for delete
  using (public.has_service_role(owner_user_id, 'director'));

create index visitor_log_owner_date_idx on public.visitor_log (owner_user_id, signed_in_at desc);
