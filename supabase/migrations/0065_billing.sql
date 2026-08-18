-- Billing/entitlement layer: turns the existing service_access register into
-- the home for Stripe subscription state and a credit-based usage model.
-- Design: subscription tier includes unlimited maintenance + a monthly
-- allowance of creation credits (docs/pricing-and-credits.md). Creating a new
-- document consumes 1 credit; everything else (review, check-ins, logging)
-- stays unmetered and untouched by this migration.

alter table public.service_access
  add column if not exists plan text
    check (plan in ('starter', 'standard', 'premium')),
  add column if not exists credit_balance integer not null default 0,
  add column if not exists credit_monthly_allowance integer not null default 0,
  add column if not exists credit_reset_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text;

create unique index if not exists service_access_stripe_customer_id_idx
  on public.service_access (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists service_access_stripe_subscription_id_idx
  on public.service_access (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Audit trail of every credit grant/consumption. Doubles as the "usage
-- history" list on the billing page — deliberately append-only, never
-- updated or deleted, so it stays a trustworthy record even if balances are
-- ever manually corrected.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_service_id_created_at_idx
  on public.credit_ledger (service_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "Service staff can view own credit ledger" on public.credit_ledger
  for select
  using (
    exists (
      select 1 from public.services s
      where s.id = credit_ledger.service_id
        and public.has_service_role(s.director_user_id, 'staff')
    )
  );

-- Atomically checks and decrements a service's credit balance, logging the
-- attempt either way. security definer + row lock so two concurrent creation
-- requests from the same centre can't both read the same balance and both
-- succeed past 0 (a plain read-then-write in application code would race).
-- Returns true if the credit was consumed, false if the balance was already 0.
create or replace function public.consume_credit(p_service_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select credit_balance into v_balance
  from public.service_access
  where service_id = p_service_id
  for update;

  if v_balance is null or v_balance <= 0 then
    return false;
  end if;

  update public.service_access
  set credit_balance = credit_balance - 1
  where service_id = p_service_id;

  insert into public.credit_ledger (service_id, delta, reason)
  values (p_service_id, -1, p_reason);

  return true;
end;
$$;

-- Grants (or resets) a service's credit balance -- used on checkout
-- completion and on each successful renewal invoice. Setting p_reset true
-- replaces the balance with the allowance (renewal); false adds on top
-- (e.g. a manual top-up purchase).
create or replace function public.grant_credits(p_service_id uuid, p_amount integer, p_reason text, p_reset boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reset then
    update public.service_access
    set credit_balance = p_amount
    where service_id = p_service_id;
  else
    update public.service_access
    set credit_balance = credit_balance + p_amount
    where service_id = p_service_id;
  end if;

  insert into public.credit_ledger (service_id, delta, reason)
  values (p_service_id, p_amount, p_reason);
end;
$$;

-- Resolves the caller's own service_id (not just owner_user_id, which
-- getMyServiceOwnerId() already provides) -- billing rows are keyed by
-- services.id, so routes that touch credits need this instead.
create or replace function public.my_service_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.services s
  join public.staff_memberships sm on sm.service_id = s.id
  where sm.user_id = auth.uid()
  limit 1;
$$;
