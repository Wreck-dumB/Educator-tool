-- Platform access register: one row per service (business), tracking whether
-- that centre is switched on for paid use. Managed by the platform owner (Dan)
-- via the /owner dashboard using the service-role key. Regular users can only
-- READ their own service's status (to show it and drive the in-app access gate).

create table if not exists public.service_access (
  service_id uuid primary key references public.services(id) on delete cascade,
  status text not null default 'trial'
    check (status in ('trial', 'active', 'suspended', 'expired')),
  trial_ends_at timestamptz,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.service_access enable row level security;

-- Read-only for the service's own staff (director/2ic/staff). Drives the
-- in-app access gate and lets a centre see its own status. There is deliberately
-- NO insert/update/delete policy: only the platform owner mutates these rows,
-- server-side via the service-role key, which bypasses RLS entirely.
create policy "Service staff can view own access" on public.service_access
  for select
  using (
    exists (
      select 1 from public.services s
      where s.id = service_access.service_id
        and public.has_service_role(s.director_user_id, 'staff')
    )
  );

-- Auto-create an access row whenever a new service is created, defaulting to
-- 'trial'. Keeps start_new_service() untouched and covers every future code
-- path that inserts a services row.
create or replace function public.create_service_access_row()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.service_access (service_id, status)
  values (new.id, 'trial')
  on conflict (service_id) do nothing;
  return new;
end;
$$;

drop trigger if exists services_create_access_row on public.services;
create trigger services_create_access_row
  after insert on public.services
  for each row execute function public.create_service_access_row();

-- Backfill existing services as 'active' -- these are current test-phase
-- centres and must not be locked out by the new gate.
insert into public.service_access (service_id, status)
select id, 'active' from public.services
on conflict (service_id) do nothing;
