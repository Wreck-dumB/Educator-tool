-- Marks auto-provisioned public demo centres so a scheduled job can find and
-- clean them up, without touching real centres. Each "Try the demo" click
-- creates a brand-new isolated director account + service (never shared
-- between visitors), so no new RLS is needed -- normal per-service isolation
-- already covers it.
alter table public.services
  add column is_demo boolean not null default false;

create index services_is_demo_idx on public.services (is_demo) where is_demo;
