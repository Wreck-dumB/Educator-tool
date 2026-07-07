alter table public.form_templates
  add column if not exists is_finalised boolean not null default false;
