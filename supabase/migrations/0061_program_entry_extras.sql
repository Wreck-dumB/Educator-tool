-- Quick custom directions for program entries that aren't linked to a saved
-- library activity (so a one-off doesn't need a full activity record), and a
-- trace from an observation back to the specific program day/activity it was
-- logged from — mirrors the existing observations.activity_id link.

alter table public.program_entries
  add column steps text[] not null default '{}';

alter table public.observations
  add column program_entry_id uuid references public.program_entries(id) on delete set null;
