-- Photo/media consent (0053) was accept-only and immutable, with the consent
-- screen's own wording promising "I can change my mind... withdraw this
-- consent at any time by contacting my child's service" but no actual
-- mechanism for that anywhere in the app - a real gap flagged in NEXT.md as
-- a follow-up. This adds a self-service withdrawal record.
--
-- Deliberately record-only, not access-revoking: what withdrawal should
-- technically DO (stop new photos of a specific child? lock the account
-- out entirely? something in between?) is a real product/legal question
-- this migration doesn't try to answer unilaterally - it records the
-- request with a timestamp and notifies the Director, who actions it
-- (e.g. stops taking that family's photos) the same way the consent
-- screen's own wording already told people to expect ("contact my child's
-- service"). media_consent_at itself is left untouched (still the
-- immutable acceptance record) - withdrawal is a separate, later event
-- layered on top, not an erasure of what was originally accepted.
alter table public.profiles
  add column if not exists media_consent_withdrawn_at timestamptz;

create or replace function public.withdraw_media_consent()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set media_consent_withdrawn_at = now()
  where id = auth.uid() and media_consent_at is not null and media_consent_withdrawn_at is null;
end;
$$;

grant execute on function public.withdraw_media_consent() to authenticated;
