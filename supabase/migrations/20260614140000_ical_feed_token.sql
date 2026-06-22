-- Per-user iCal feed token. Used as the opaque secret in the public feed URL
-- so users can subscribe to their GleeWorld calendar from Google / Apple /
-- Outlook without OAuth. The token is the auth — anyone who has the URL
-- can read that user's events, same trust model Google Calendar uses for
-- its private iCal URLs.
--
-- Rotating: a user can regenerate the token (UPDATE) to invalidate every
-- existing subscription URL — useful if the URL leaks.

alter table public.gw_profiles
  add column if not exists ical_feed_token uuid;

-- Backfill existing rows.
update public.gw_profiles
   set ical_feed_token = gen_random_uuid()
 where ical_feed_token is null;

alter table public.gw_profiles
  alter column ical_feed_token set default gen_random_uuid(),
  alter column ical_feed_token set not null;

create unique index if not exists gw_profiles_ical_feed_token_uniq
  on public.gw_profiles (ical_feed_token);

-- The user can read + rotate their OWN token (RLS on gw_profiles already
-- limits SELECT/UPDATE to the caller's own row). No extra policy needed —
-- the existing self-edit policy carries the new column.
