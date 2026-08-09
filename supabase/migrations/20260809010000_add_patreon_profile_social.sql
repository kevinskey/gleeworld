-- Add Patreon to the social media profile options.
-- gw_profiles stores social handles two ways today: dedicated columns
-- (Profile page) and the social_media_links JSON blob (Profile Setup /
-- admin user panel). Patreon needs the column; the JSON needs no DDL.
ALTER TABLE public.gw_profiles
  ADD COLUMN IF NOT EXISTS patreon text;

COMMENT ON COLUMN public.gw_profiles.patreon IS 'Patreon handle or profile URL';
