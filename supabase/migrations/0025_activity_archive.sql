alter table public.generated_activities
  add column if not exists is_archived boolean not null default false;
