-- Apple Music binding for scores. Stores the catalog song ID + storefront
-- so playback can resolve the right regional version. The audio companion
-- prefers Apple Music when an apple_music_id is set, falling back to
-- audio_url (MP3 / YouTube) only when not.

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS apple_music_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_music_storefront TEXT,
  ADD COLUMN IF NOT EXISTS apple_music_title TEXT,
  ADD COLUMN IF NOT EXISTS apple_music_artist TEXT,
  ADD COLUMN IF NOT EXISTS apple_music_artwork_url TEXT;

CREATE INDEX IF NOT EXISTS gw_sheet_music_apple_music_id_idx
  ON public.gw_sheet_music (apple_music_id) WHERE apple_music_id IS NOT NULL;
