-- Add audio_url column to gw_sheet_music for persistent audio associations
ALTER TABLE public.gw_sheet_music 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_title TEXT;