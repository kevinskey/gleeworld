-- Per-tenant SoundCloud profile, powering the Command Center SoundCloud page.
--
-- Follows the youtube_channel_handle / youtube_channel_id precedent already
-- on this table: the tenant's external channel lives in branding, so nothing
-- tenant-specific is baked into shared code.
--
-- A plain profile URL (https://soundcloud.com/<name>) rather than a numeric
-- id: it is what an admin can copy from their own browser, and the
-- soundcloud-playlists function resolves it to an id server-side.

ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS soundcloud_url text;

COMMENT ON COLUMN public.gw_branding_settings.soundcloud_url IS
  'Public SoundCloud profile URL for this tenant, e.g. https://soundcloud.com/doctorkj. Empty = the SoundCloud page shows its setup prompt.';
