-- Add playlist columns to gw_media_library for persisting AzuraCast playlist assignments
ALTER TABLE public.gw_media_library 
ADD COLUMN IF NOT EXISTS azura_playlist_id INTEGER,
ADD COLUMN IF NOT EXISTS azura_playlist_name TEXT;