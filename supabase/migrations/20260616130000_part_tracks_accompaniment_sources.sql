-- Extend the part-tracks project to allow Apple Music catalog tracks and
-- YouTube URLs as the backing track, alongside the existing file upload.
-- We can't capture DRM'd Apple Music or YouTube audio into a Web Audio
-- mix (they live outside the page's audio graph), but we CAN play them
-- in parallel with the multitrack recorder so the user sings along and
-- only their voice is captured. Storing the catalog ID + storefront + a
-- snapshot of artwork lets the studio surface a proper card without a
-- second round-trip to MusicKit.

ALTER TABLE public.gw_part_tracks_projects
  ADD COLUMN IF NOT EXISTS accompaniment_kind TEXT
    CHECK (accompaniment_kind IN ('file','apple_music','youtube'))
    DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS accompaniment_apple_music_id TEXT,
  ADD COLUMN IF NOT EXISTS accompaniment_apple_music_storefront TEXT,
  ADD COLUMN IF NOT EXISTS accompaniment_apple_music_artist TEXT,
  ADD COLUMN IF NOT EXISTS accompaniment_apple_music_artwork_url TEXT,
  ADD COLUMN IF NOT EXISTS accompaniment_youtube_url TEXT;
