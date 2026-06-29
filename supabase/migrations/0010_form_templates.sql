-- General forms library - AI-drafted templates where wording genuinely
-- varies by service (permission slips, consent forms, miscellaneous
-- notices), modeled directly on the policy builder (0003_swp_and_policies.sql).
--
-- Deliberately NOT used for enrolment records or incident records - those
-- have specific mandatory fields fixed by the Education and Care Services
-- National Regulations (Reg 160-162 for enrolment, Reg 87 for incident/
-- injury/trauma/illness), so they get dedicated structured tables/forms
-- instead of AI-drafted free text, the same reasoning that kept "SWMS"
-- out of the safe-work-procedures feature.
create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  your_input text not null,
  purpose text,
  fields_to_complete text[] not null default '{}',
  body_text text,
  requires_signature boolean not null default false,
  suggested_additions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index form_templates_owner_user_id_idx on public.form_templates (owner_user_id);

alter table public.form_templates enable row level security;

create policy "Owner can view own form templates" on public.form_templates for select using (owner_user_id = auth.uid());
create policy "Owner can insert own form templates" on public.form_templates for insert with check (owner_user_id = auth.uid());
create policy "Owner can update own form templates" on public.form_templates for update using (owner_user_id = auth.uid());
create policy "Owner can delete own form templates" on public.form_templates for delete using (owner_user_id = auth.uid());
