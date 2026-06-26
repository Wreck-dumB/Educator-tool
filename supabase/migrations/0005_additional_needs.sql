-- Optional per-child additional needs/constraints (physical, emotional,
-- disability, neurodiversity, family, environmental, legal) to help the
-- generator adapt activities respectfully and practically. Same privacy
-- posture as current_interests - RLS-protected, owner-only, no new exposure.
alter table public.children add column additional_needs text;
