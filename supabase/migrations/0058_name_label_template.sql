-- ─── Add 'name_label' as a valid suggested_template value ─────────────────────
-- New template: the child's own name in solid bold text (no hollow outline,
-- no dotted trace guide), for place markers, cubby/desk labels, name tags.
-- Previously the only two name-related templates were both intentionally
-- non-solid (name_trace = dotted, name_colouring = hollow outline), so there
-- was no way to get a solid-fill name print regardless of how it was worded.
ALTER TABLE public.generated_activities
  DROP CONSTRAINT IF EXISTS generated_activities_suggested_template_check,
  ADD CONSTRAINT generated_activities_suggested_template_check
    CHECK (suggested_template IS NULL OR suggested_template IN (
      'name_trace', 'name_colouring', 'name_label', 'letter_colouring', 'drawing_frame',
      'writing_lines', 'card_set', 'matching_pairs', 'counting_groups'
    ));
