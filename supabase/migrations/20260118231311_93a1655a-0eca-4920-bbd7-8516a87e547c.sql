-- Add hymn_number and youtube_url columns to liturgical_music_plan table if not exists
ALTER TABLE public.liturgical_music_plan
ADD COLUMN IF NOT EXISTS hymn_number TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT;