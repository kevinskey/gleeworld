-- Scheduled playlists (Kevin 2026-08-11): a playlist attached to a calendar
-- event. The column stores a ready-to-run assistant CLIENT ACTION
-- ({tool, args, label}) so the tap-to-play chip replays it through the
-- existing action machinery — no second playback path to maintain.
-- Browsers cannot start audio unattended, so "scheduled" means: when the
-- event starts, the app offers one tap to play.
alter table public.gw_events add column if not exists assistant_playlist jsonb;
