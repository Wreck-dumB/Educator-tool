-- ─── Add 6 new suggested_template values + their companion columns ───────────
-- Genre-gap analysis against common early-years worksheet formats (see
-- session notes) found six formats SparkPlay couldn't generate: letter_trace
-- (stroke practice, distinct from letter_colouring's hollow fill-in),
-- trace_maze, dot_to_dot, odd_one_out, feelings_checkin, and cut_and_sort.
ALTER TABLE public.generated_activities
  DROP CONSTRAINT IF EXISTS generated_activities_suggested_template_check,
  ADD CONSTRAINT generated_activities_suggested_template_check
    CHECK (suggested_template IS NULL OR suggested_template IN (
      'name_trace', 'name_colouring', 'name_label', 'letter_colouring', 'drawing_frame',
      'writing_lines', 'card_set', 'matching_pairs', 'counting_groups',
      'letter_trace', 'trace_maze', 'dot_to_dot', 'odd_one_out', 'feelings_checkin', 'cut_and_sort'
    )),
  ADD COLUMN IF NOT EXISTS maze_start_emoji text,
  ADD COLUMN IF NOT EXISTS maze_end_emoji text,
  ADD COLUMN IF NOT EXISTS dot_to_dot_shape text,
  ADD COLUMN IF NOT EXISTS odd_one_out_same text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS odd_one_out_different text,
  ADD COLUMN IF NOT EXISTS cut_and_sort_groups jsonb NOT NULL DEFAULT '[]';
