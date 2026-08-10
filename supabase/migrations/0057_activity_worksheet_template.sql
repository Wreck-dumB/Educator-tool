-- ─── Persist AI-suggested worksheet template + its structured data ───────────
-- The generation engine already picks a print template (name_trace,
-- letter_colouring, card_set, matching_pairs, counting_groups, etc.) and
-- returns the structured data each one needs, but none of it was ever saved
-- alongside the activity. The Worksheets page had no choice but to re-guess
-- the template from title/step text at print time — which can never produce
-- the four data-driven templates — so saved activities kept printing the
-- same generic activity_sheet/instructions layout regardless of what the AI
-- actually suggested.
ALTER TABLE public.generated_activities
  ADD COLUMN IF NOT EXISTS suggested_template text
    CHECK (suggested_template IS NULL OR suggested_template IN (
      'name_trace', 'name_colouring', 'letter_colouring', 'drawing_frame',
      'writing_lines', 'card_set', 'matching_pairs', 'counting_groups'
    )),
  ADD COLUMN IF NOT EXISTS card_items text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS card_pairs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_subject text,
  ADD COLUMN IF NOT EXISTS letter_text text,
  ADD COLUMN IF NOT EXISTS matching_left text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matching_right text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS counting_groups jsonb NOT NULL DEFAULT '[]';
