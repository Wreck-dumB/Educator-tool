-- ─── admin_reviewed_by should SET NULL, not block, on account deletion ───────
-- Found during testing: with no ON DELETE clause, Postgres defaults to
-- RESTRICT — deleting a platform-owner auth account that has approved any
-- shared_library_activities row becomes permanently impossible. CASCADE would
-- be worse (it would delete the actual approved community content along with
-- the admin's account). SET NULL just loses the "who approved it" attribution
-- while keeping the approved content and its 'approved' status intact.
ALTER TABLE public.shared_library_activities
  DROP CONSTRAINT shared_library_activities_admin_reviewed_by_fkey,
  ADD CONSTRAINT shared_library_activities_admin_reviewed_by_fkey
    FOREIGN KEY (admin_reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
