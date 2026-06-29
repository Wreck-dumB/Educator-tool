-- Digital permission slips with e-signature - the schema designed during
-- the parent-portal security planning (Phase 2.5), implemented now since
-- it doesn't depend on the document-upload/Storage piece, only on the
-- parent linking already built in 0008.
--
-- Versioned and append-only: editing a slip's text after sending NEVER
-- updates a row in permission_slip_versions, it inserts a new version and
-- re-targets. on delete restrict (not cascade) on signatures.version_id,
-- plus no update/delete policy on versions or signatures anywhere, is what
-- guarantees a signed version can never be altered or deleted while a
-- signature references it - a signature, once recorded, is permanent.
--
-- Click-to-sign (typed name + explicit affirmation + server-captured
-- timestamp) rather than a drawn signature. This is a real legal question
-- outside what this app can verify: confirm with your own regulator/
-- insurer that this is sufficient before relying on it for anything
-- beyond routine consent (excursions, photo/media) - requires_high_stakes_ack
-- exists to force an extra warning screen for higher-stakes categories
-- like medication authorisation, but does not itself make the signature
-- legally sufficient for that use.
create table public.permission_slips (
  id uuid primary key default gen_random_uuid(),
  educator_user_id uuid not null references auth.users(id) on delete cascade,
  slip_type text not null check (slip_type in ('excursion_consent', 'photo_media_consent', 'medication_authorisation', 'other')),
  title text not null,
  current_version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'sent', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.permission_slips enable row level security;

create policy "Educator can manage own slips" on public.permission_slips for all
  using (educator_user_id = auth.uid()) with check (educator_user_id = auth.uid());

create policy "Linked parent can view slip sent to their child" on public.permission_slips for select
  using (exists (
    select 1 from public.permission_slip_targets t
    where t.slip_id = permission_slips.id and public.is_linked_parent(t.child_id)
  ));

create table public.permission_slip_versions (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.permission_slips(id) on delete cascade,
  version_number int not null,
  body_text text not null,
  requires_high_stakes_ack boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slip_id, version_number)
);
-- No update/delete policy on this table at all, for anyone, ever.

alter table public.permission_slip_versions enable row level security;

create policy "Educator can view own slip versions" on public.permission_slip_versions for select
  using (exists (select 1 from public.permission_slips s where s.id = slip_id and s.educator_user_id = auth.uid()));
create policy "Educator can insert versions for own slips" on public.permission_slip_versions for insert
  with check (exists (select 1 from public.permission_slips s where s.id = slip_id and s.educator_user_id = auth.uid()));
-- Parent sees ONLY the specific version actually targeted to their child -- never the slip's latest
-- version if it differs from what was sent to them.
create policy "Linked parent can view version sent to their child" on public.permission_slip_versions for select
  using (exists (
    select 1 from public.permission_slip_targets t
    where t.slip_id = permission_slip_versions.slip_id
      and t.sent_version_number = permission_slip_versions.version_number
      and public.is_linked_parent(t.child_id)
  ));

create table public.permission_slip_targets (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.permission_slips(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  sent_version_number int not null,
  created_at timestamptz not null default now(),
  unique (slip_id, child_id)
);

alter table public.permission_slip_targets enable row level security;

create policy "Educator can manage targets for own slips" on public.permission_slip_targets for all
  using (exists (select 1 from public.permission_slips s where s.id = slip_id and s.educator_user_id = auth.uid()))
  with check (exists (select 1 from public.permission_slips s where s.id = slip_id and s.educator_user_id = auth.uid()));
create policy "Linked parent can view own child's target" on public.permission_slip_targets for select
  using (public.is_linked_parent(child_id));

create table public.permission_slip_signatures (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.permission_slips(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  version_id uuid not null references public.permission_slip_versions(id) on delete restrict,
  signed_by uuid not null references auth.users(id) on delete cascade,
  signer_typed_name text not null check (char_length(signer_typed_name) between 1 and 200),
  affirmed boolean not null check (affirmed = true),
  signed_at timestamptz not null default now(),
  unique (slip_id, child_id)
);
-- No update/delete policy on signatures, for anyone, ever.

alter table public.permission_slip_signatures enable row level security;

create policy "Educator can view signatures for own slips" on public.permission_slip_signatures for select
  using (exists (select 1 from public.permission_slips s where s.id = slip_id and s.educator_user_id = auth.uid()));
create policy "Parent can view own signature" on public.permission_slip_signatures for select using (signed_by = auth.uid());

-- The load-bearing policy: version_id must match the version actually SENT to this exact child,
-- re-checked live at the moment of signing -- not whatever the client claims, and not a stale
-- cached version_id from before the educator revised the slip.
create policy "Linked parent can sign for linked child against sent version" on public.permission_slip_signatures for insert
  with check (
    signed_by = auth.uid() and affirmed = true and public.is_linked_parent(child_id)
    and exists (
      select 1 from public.permission_slip_targets t
      where t.slip_id = permission_slip_signatures.slip_id
        and t.child_id = permission_slip_signatures.child_id
        and t.sent_version_number = (
          select v.version_number from public.permission_slip_versions v where v.id = permission_slip_signatures.version_id
        )
    )
  );
