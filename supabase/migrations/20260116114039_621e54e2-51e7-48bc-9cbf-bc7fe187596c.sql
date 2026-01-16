-- Add channel support to lyke_house_hero table
ALTER TABLE public.lyke_house_hero 
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'video' CHECK (source_type IN ('video', 'channel'));

-- Add comment for clarity
COMMENT ON COLUMN public.lyke_house_hero.channel_id IS 'YouTube channel ID for auto-fetching videos';
COMMENT ON COLUMN public.lyke_house_hero.source_type IS 'Whether this is a direct video or auto-fetched from channel';