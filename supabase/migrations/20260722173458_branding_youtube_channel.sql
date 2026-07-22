-- Let a tenant tie its Video Library to a YouTube channel. Admin sets
-- the channel's handle (@GleeWorldOfficial) OR its channel_id (UC...)
-- in Workspace Settings → Branding; the /video page can then hit a
-- edge fn to import the channel's uploads into youtube_videos and
-- get all the app's library features (tabs, tags, share, playlists).
--
-- Both fields nullable — a tenant may not have a YouTube presence.
-- We store both so a resolved handle can cache its channel_id after
-- the first sync (handle→ID lookup costs an extra API call).
ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS youtube_channel_handle TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;
