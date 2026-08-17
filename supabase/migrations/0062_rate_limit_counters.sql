-- Shared-store rate limiting, replacing the in-memory Map in src/lib/rateLimit.ts
-- (which reset per serverless cold start and wasn't shared across instances, so
-- limits weren't actually enforced once more than one instance was warm). Fixed
-- hourly windows, keyed on the same strings the app already builds
-- (e.g. `qip:${user.id}`) plus the bucket start. Internal-only table, never
-- queried by anon/authenticated clients — RLS on with no policies blocks them;
-- the app talks to it exclusively through the service-role admin client.

create table public.rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

alter table public.rate_limit_counters enable row level security;

-- Atomic increment-and-read so concurrent requests from different serverless
-- instances can't race past the limit (a plain select-then-upsert could).
create or replace function public.increment_rate_limit(p_key text, p_window_start timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.rate_limit_counters (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limit_counters.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
