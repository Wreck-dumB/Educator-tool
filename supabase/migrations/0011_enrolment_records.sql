-- Expands children into real enrolment records, so health/emergency
-- information is on file and quickly accessible - not AI-generated, these
-- are the actual mandatory fields under the Education and Care Services
-- National Regulations:
-- - Reg 162 (health information): doctor/medical service, Medicare number,
--   specific healthcare needs/medical conditions, allergies (incl.
--   anaphylaxis risk), medical management/risk minimisation plan, dietary
--   restrictions, immunisation status.
-- - Reg 161 (authorisations) + Reg 160 (emergency contacts): each child
--   needs a way to record people authorised as: emergency contact (if a
--   parent can't be reached), authorised nominee (pickup), medical
--   treatment/medication consent, and excursion/outside-premises consent.
--   In practice one person often holds several of these roles at once, so
--   child_contacts uses boolean flags per authorisation rather than a
--   single fixed "type", and a child can have many contacts.
alter table public.children
  add column address text,
  add column medical_practice_name text,
  add column medical_practice_phone text,
  add column medicare_number text,
  add column medical_conditions text,
  add column is_anaphylaxis_risk boolean not null default false,
  add column medical_management_plan text,
  add column dietary_restrictions text,
  add column immunisation_status text;

create table public.child_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text,
  email text,
  is_parent_guardian boolean not null default false,
  is_emergency_contact boolean not null default false,
  is_authorised_nominee boolean not null default false,
  can_consent_medical_treatment boolean not null default false,
  can_authorise_medication boolean not null default false,
  can_authorise_excursions boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index child_contacts_child_id_idx on public.child_contacts (child_id);

alter table public.child_contacts enable row level security;

create policy "Owner can view own child contacts" on public.child_contacts for select using (owner_user_id = auth.uid());
create policy "Owner can insert own child contacts" on public.child_contacts for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own child contacts" on public.child_contacts for update using (owner_user_id = auth.uid());
create policy "Owner can delete own child contacts" on public.child_contacts for delete using (owner_user_id = auth.uid());

-- NOTE: the existing "Linked parent can view linked child" policy on
-- children (0008) grants SELECT on the whole row, so these new health
-- columns become visible to a linked parent too - consistent with the
-- decision already made for additional_needs (this is the parent's own
-- child's information). child_contacts gets NO parent policy at all in
-- this migration - a parent doesn't need to see who else is authorised to
-- collect their own child; revisit only if a real need for it emerges.
