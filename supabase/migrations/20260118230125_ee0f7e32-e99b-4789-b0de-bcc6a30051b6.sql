-- Add hymn_number column to lh100_music_selections table
ALTER TABLE public.lh100_music_selections 
ADD COLUMN IF NOT EXISTS hymn_number TEXT;