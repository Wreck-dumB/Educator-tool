-- procedure_steps was a flat text[] (just wording, no structure), which meant
-- every policy - AI-generated or regenerated from an uploaded document - had
-- no way to distinguish a section heading from a bullet from a paragraph once
-- saved, so the on-screen view and Word export always rendered a single flat
-- numbered list regardless of the source document's real structure. Move to
-- jsonb storing {type, level, text} objects; existing rows are converted to
-- plain "paragraph" steps so no saved policy content is lost.
--
-- Postgres doesn't allow a correlated subquery in an ALTER COLUMN ... USING
-- transform expression, so the conversion is done via a scratch column
-- instead of a single ALTER ... TYPE ... USING.
alter table public.policies add column procedure_steps_new jsonb;

update public.policies
set procedure_steps_new = coalesce(
  (
    select jsonb_agg(jsonb_build_object('type', 'paragraph', 'level', 0, 'text', elem))
    from unnest(procedure_steps) as elem
  ),
  '[]'::jsonb
);

alter table public.policies alter column procedure_steps_new set not null;
alter table public.policies alter column procedure_steps_new set default '[]'::jsonb;

alter table public.policies drop column procedure_steps;
alter table public.policies rename column procedure_steps_new to procedure_steps;
