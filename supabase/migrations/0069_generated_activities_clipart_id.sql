-- Id of a pre-made icon (src/lib/clipart.ts) matching image_subject, when the
-- AI found one -- a reliable pre-made picture used instead of generating one.
alter table generated_activities add column if not exists clipart_id text;
