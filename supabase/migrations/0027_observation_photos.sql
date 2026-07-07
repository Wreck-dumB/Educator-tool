alter table public.observations
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('observation-photos', 'observation-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "Staff can upload observation photos" on storage.objects
  for insert with check (
    bucket_id = 'observation-photos'
    and exists (
      select 1 from public.services s
      join public.staff_memberships sm on sm.service_id = s.id
      where sm.user_id = auth.uid() and sm.status = 'active'
    )
  );

create policy "Staff can read observation photos" on storage.objects
  for select using (
    bucket_id = 'observation-photos'
    and exists (
      select 1 from public.services s
      join public.staff_memberships sm on sm.service_id = s.id
      where sm.user_id = auth.uid() and sm.status = 'active'
    )
  );
