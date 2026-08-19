-- parent_notifications (0034) has no client INSERT policy at all -- its own
-- comment says this is fine because "server-side inserts go through the
-- service role", but every server action in this app actually uses
-- lib/supabase/server.ts's createClient(), which is the anon key bound to
-- the caller's session cookies (RLS-enforced), never a service-role client
-- (confirmed: 0008's own top-of-file warning that RLS is the entire defense
-- here, not a backstop). That mismatch means every existing staff-to-parent
-- notification insert (e.g. incident-report "notify family", and this
-- migration's own enrolment-review notify calls) has been silently
-- rejected by RLS and swallowed because the calling code didn't check the
-- insert error -- found while smoke-testing the enrolment submission
-- feature (0066), fixed here for all staff-to-parent notification writes,
-- not just the new ones.
create policy "Staff can notify a linked parent"
  on public.parent_notifications for insert
  with check (
    exists (
      select 1 from public.parent_child_links pcl
      where pcl.parent_user_id = parent_notifications.recipient_user_id
        and public.has_service_role(pcl.educator_user_id, 'staff')
    )
  );
