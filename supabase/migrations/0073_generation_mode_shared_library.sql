-- ─── Add 'shared_library' as a valid generation_mode value ────────────────────
-- Copying an approved activity from the cross-tenant shared library into a
-- service's own generated_activities isn't materials/time/outcome/interest/
-- surprise_me generation — it needs its own honest label rather than being
-- misattributed to the closest existing mode.
ALTER TABLE public.generated_activities
  DROP CONSTRAINT IF EXISTS generated_activities_generation_mode_check,
  ADD CONSTRAINT generated_activities_generation_mode_check
    CHECK (generation_mode IN ('materials', 'time', 'outcome', 'interest', 'surprise_me', 'shared_library'));
