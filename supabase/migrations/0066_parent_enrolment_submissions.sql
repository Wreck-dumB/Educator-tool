-- Parent self-serve enrolment submissions: parents propose changes to their
-- child's profile/health fields, emergency/authorised-pickup contacts, and
-- upload supporting documents (immunisation statements, medical plans,
-- court orders) from home instead of it all being gathered face-to-face.
-- Nothing here ever writes to children/child_contacts directly -- every
-- table is a pending/approved/rejected proposal, applied to the live record
-- only by a 2IC+ staff action (mirrors wall_posts, 0030). This is also the
-- first migration granting a parent any Storage write access in this app;
-- see the bucket policies below for why that's kept safe.

-- =========================================
-- child_enrolment_submissions: full proposed snapshot of the
-- parent-editable subset of children. Deliberately EXCLUDES
-- immunisation_status/immunisation_checked_date/immunisation_notes -- Reg
-- 162 requires staff to have physically sighted the AIR statement, so a
-- parent's own claim of "up to date" is not evidence of that -- and
-- excludes room_id/enrolment_ended_at (operational, not the parent's to set).
-- =========================================
create table if not exists public.child_enrolment_submissions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,

  first_name text,
  date_of_birth date,
  current_interests text,
  additional_needs text, -- app-layer encrypted, same convention as children.additional_needs
  address text,
  medical_practice_name text,
  medical_practice_phone text,
  medicare_number text,
  medical_conditions text,
  is_anaphylaxis_risk boolean,
  medical_management_plan text,
  dietary_restrictions text,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists child_enrolment_submissions_child_idx
  on public.child_enrolment_submissions (child_id, status, created_at desc);
create index if not exists child_enrolment_submissions_educator_idx
  on public.child_enrolment_submissions (educator_user_id, status);

alter table public.child_enrolment_submissions enable row level security;

create policy "Parent can view own enrolment submissions"
  on public.child_enrolment_submissions for select
  using (submitted_by = auth.uid());

create policy "Staff can view service enrolment submissions"
  on public.child_enrolment_submissions for select
  using (public.has_service_role(educator_user_id, 'staff'));

-- educator_user_id is re-derived from child_id here, not trusted from the
-- client -- closes the forgery path where a parent could otherwise submit a
-- proposal claiming to belong to a different service.
create policy "Linked parent can submit pending enrolment update"
  on public.child_enrolment_submissions for insert
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and public.is_linked_parent(child_id)
    and educator_user_id = (select owner_user_id from public.children where id = child_id)
  );

-- 2IC+ can apply/reject (same threshold as casual day requests -- a plain
-- staff member can view but not commit changes to the legal record).
create policy "2IC+ can review enrolment submissions"
  on public.child_enrolment_submissions for update
  using (public.has_service_role(educator_user_id, '2ic'))
  with check (public.has_service_role(educator_user_id, '2ic'));
-- NOTE: no UPDATE for the submitting parent at any status -- same
-- bait-and-switch prevention as wall_posts (0030): once staff starts
-- reviewing, the parent can no longer quietly change what's under review.

create policy "Parent can delete own pending enrolment submission"
  on public.child_enrolment_submissions for delete
  using (submitted_by = auth.uid() and status = 'pending');

-- =========================================
-- child_enrolment_documents: uploaded files (immunisation statements,
-- medical plans, court orders, etc). Approving a document only marks it
-- reviewed/on-file -- it NEVER writes children.immunisation_status; that
-- stays a separate, deliberate staff action via updateImmunisationStatus
-- (0011's "staff physically sighted proof" rule applies just as much to a
-- PDF as a paper original).
-- =========================================
create table if not exists public.child_enrolment_documents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,

  document_type text not null check (document_type in (
    'immunisation_statement', 'medical_management_plan', 'court_order',
    'enrolment_form', 'other'
  )),
  storage_path text not null,
  original_filename text not null, -- display-only, never used to build the storage key
  file_size bigint,
  mime_type text,
  notes text,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists child_enrolment_documents_child_idx
  on public.child_enrolment_documents (child_id, status, created_at desc);
create index if not exists child_enrolment_documents_educator_idx
  on public.child_enrolment_documents (educator_user_id, status);

alter table public.child_enrolment_documents enable row level security;

create policy "Parent can view own uploaded documents"
  on public.child_enrolment_documents for select
  using (uploaded_by = auth.uid());

create policy "Staff can view service enrolment documents"
  on public.child_enrolment_documents for select
  using (public.has_service_role(educator_user_id, 'staff'));

create policy "Linked parent can upload pending document"
  on public.child_enrolment_documents for insert
  with check (
    uploaded_by = auth.uid()
    and status = 'pending'
    and public.is_linked_parent(child_id)
    and educator_user_id = (select owner_user_id from public.children where id = child_id)
  );

create policy "2IC+ can review enrolment documents"
  on public.child_enrolment_documents for update
  using (public.has_service_role(educator_user_id, '2ic'))
  with check (public.has_service_role(educator_user_id, '2ic'));

create policy "Parent can delete own pending document"
  on public.child_enrolment_documents for delete
  using (uploaded_by = auth.uid() and status = 'pending');

create policy "Staff can delete service enrolment documents"
  on public.child_enrolment_documents for delete
  using (public.has_service_role(educator_user_id, 'staff'));

-- =========================================
-- child_contact_submissions: propose adding a new emergency/pickup contact,
-- editing an existing one, or requesting removal. `action` +
-- `existing_contact_id` together say which; child_contacts itself is never
-- touched until a 2IC+ approves.
-- =========================================
create table if not exists public.child_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,

  action text not null check (action in ('add', 'update', 'remove')),
  existing_contact_id uuid references public.child_contacts(id) on delete cascade,

  full_name text,
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

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),

  check (action = 'add' or existing_contact_id is not null),
  check (action = 'remove' or full_name is not null)
);

create index if not exists child_contact_submissions_child_idx
  on public.child_contact_submissions (child_id, status, created_at desc);
create index if not exists child_contact_submissions_educator_idx
  on public.child_contact_submissions (educator_user_id, status);

alter table public.child_contact_submissions enable row level security;

create policy "Parent can view own contact submissions"
  on public.child_contact_submissions for select
  using (submitted_by = auth.uid());

create policy "Staff can view service contact submissions"
  on public.child_contact_submissions for select
  using (public.has_service_role(educator_user_id, 'staff'));

create policy "Linked parent can submit pending contact change"
  on public.child_contact_submissions for insert
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and public.is_linked_parent(child_id)
    and educator_user_id = (select owner_user_id from public.children where id = child_id)
  );

create policy "2IC+ can review contact submissions"
  on public.child_contact_submissions for update
  using (public.has_service_role(educator_user_id, '2ic'))
  with check (public.has_service_role(educator_user_id, '2ic'));

create policy "Parent can delete own pending contact submission"
  on public.child_contact_submissions for delete
  using (submitted_by = auth.uid() and status = 'pending');

-- =========================================
-- Storage: enrolment-documents. Private, first bucket a parent ever gets
-- write access to in this app. Two things keep that safe:
--   1. Path is always '<child_id>/<uuid>.<ext>' -- the uuid and extension
--      are server-generated (src/app/parent/(portal)/enrolment/actions.ts),
--      the parent-supplied original filename is stored only as a text
--      column on child_enrolment_documents, never folded into the storage
--      key. Closes path-traversal/injection via a crafted filename.
--   2. (storage.foldername(name))[1]::uuid casts the folder segment to
--      uuid -- an invalid/forged segment raises and the policy fails
--      closed, exactly like the existing poster-images policies (0021).
-- allowed_mime_types is enforced by Supabase Storage against the
-- client-declared Content-Type at upload time -- this is NOT deep content
-- sniffing, so a mislabelled file can still get through the type check.
-- Acceptable here because objects are never executed, only ever served back
-- via short-lived signed URLs to the uploading parent or that child's own
-- staff -- a malware scan on this bucket is a reasonable v2 follow-up.
-- =========================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('enrolment-documents', 'enrolment-documents', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Linked parent can upload own child's enrolment documents"
  on storage.objects for insert
  with check (
    bucket_id = 'enrolment-documents'
    and public.is_linked_parent((storage.foldername(name))[1]::uuid)
  );

create policy "Linked parent can view own child's enrolment documents"
  on storage.objects for select
  using (
    bucket_id = 'enrolment-documents'
    and public.is_linked_parent((storage.foldername(name))[1]::uuid)
  );

-- Parent can only remove an object while its metadata row is still
-- pending -- same "can retract before review starts" rule as the table
-- itself; once staff has approved/rejected, the object is immutable to the
-- parent (this EXISTS check simply stops matching once status changes).
create policy "Parent can delete own pending enrolment document object"
  on storage.objects for delete
  using (
    bucket_id = 'enrolment-documents'
    and exists (
      select 1 from public.child_enrolment_documents d
      where d.storage_path = storage.objects.name
        and d.uploaded_by = auth.uid()
        and d.status = 'pending'
    )
  );

create policy "Staff can view service enrolment document objects"
  on storage.objects for select
  using (
    bucket_id = 'enrolment-documents'
    and public.has_service_role(
      (select owner_user_id from public.children where id = (storage.foldername(name))[1]::uuid),
      'staff'
    )
  );

create policy "Staff can delete service enrolment document objects"
  on storage.objects for delete
  using (
    bucket_id = 'enrolment-documents'
    and public.has_service_role(
      (select owner_user_id from public.children where id = (storage.foldername(name))[1]::uuid),
      'staff'
    )
  );

-- =========================================
-- parent_notifications: new type so parents are told when a review lands.
-- =========================================
alter table public.parent_notifications
  drop constraint if exists parent_notifications_type_check;
alter table public.parent_notifications
  add constraint parent_notifications_type_check
  check (type in (
    'observation_shared', 'new_message', 'permission_slip', 'wall_post_approved',
    'absence_acknowledged', 'broadcast_message', 'incident_update', 'daily_summary',
    'enrolment_update_reviewed'
  ));
