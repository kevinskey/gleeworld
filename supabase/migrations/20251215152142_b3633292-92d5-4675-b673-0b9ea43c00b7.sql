-- Add playlist columns to audio_archive for persisting AzuraCast playlist assignments
ALTER TABLE public.audio_archive 
ADD COLUMN IF NOT EXISTS azura_playlist_id INTEGER,
ADD COLUMN IF NOT EXISTS azura_playlist_name TEXT;