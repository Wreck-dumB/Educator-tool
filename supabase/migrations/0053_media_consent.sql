-- Account-level photo & media consent gate.
-- Every account (parents and staff) must accept a photo/media consent
-- statement before using the app, mirroring the terms-acceptance gate in 0047.

alter table public.profiles
  add column if not exists media_consent_at timestamptz,
  add column if not exists media_consent_version text;  -- which version was accepted

-- Security-definer so the app doesn't need an UPDATE policy on profiles.
-- Only sets media_consent_at once (immutable after first acceptance).
create or replace function public.accept_media_consent(_version text default '1.0')
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set media_consent_at = now(), media_consent_version = _version
  where id = auth.uid() and media_consent_at is null;
end;
$$;

grant execute on function public.accept_media_consent(text) to authenticated;
