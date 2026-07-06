-- Poster/flier maker for educators. A poster row stores the text content,
-- a theme, and at most one image: either an educator upload (image_path in
-- the private poster-images bucket) or a stock photo picked via the
-- copyright-safe image search (image_url + attribution). Staff-level RLS
-- like other day-to-day operational tables (0018 pattern).
create table public.posters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  body_text text,
  footer_text text,
  theme text not null default 'coral' check (theme in ('coral', 'sage', 'amber', 'ink', 'plain')),
  image_source text check (image_source in ('upload', 'stock')),
  image_path text,   -- storage path when image_source = 'upload'
  image_url text,    -- hotlinked stock URL when image_source = 'stock'
  image_credit text, -- attribution line when the stock licence needs one (Openverse CC BY)
  created_at timestamptz not null default now()
);

create index posters_owner_user_id_idx on public.posters (owner_user_id);

alter table public.posters enable row level security;

create policy "Staff can view service posters" on public.posters for select using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can insert service posters" on public.posters for insert with check (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can update service posters" on public.posters for update using (public.has_service_role(owner_user_id, 'staff'));
create policy "Staff can delete service posters" on public.posters for delete using (public.has_service_role(owner_user_id, 'staff'));

-- Private bucket for uploaded poster photos. Private (served via signed
-- URLs) because educator photos may include children. Object paths are
-- '<owner_user_id>/<uuid>.<ext>' so storage RLS can gate on the service the
-- caller belongs to, same threshold as the posters table itself.
insert into storage.buckets (id, name, public)
values ('poster-images', 'poster-images', false)
on conflict (id) do nothing;

create policy "Staff can view service poster images" on storage.objects for select
  using (bucket_id = 'poster-images' and public.has_service_role((storage.foldername(name))[1]::uuid, 'staff'));
create policy "Staff can upload service poster images" on storage.objects for insert
  with check (bucket_id = 'poster-images' and public.has_service_role((storage.foldername(name))[1]::uuid, 'staff'));
create policy "Staff can delete service poster images" on storage.objects for delete
  using (bucket_id = 'poster-images' and public.has_service_role((storage.foldername(name))[1]::uuid, 'staff'));
