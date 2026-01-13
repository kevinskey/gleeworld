-- Add video_url column to gw_hero_slides for YouTube video support
ALTER TABLE public.gw_hero_slides 
ADD COLUMN IF NOT EXISTS video_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.gw_hero_slides.video_url IS 'YouTube video URL or ID for video slides. When set, displays embedded video instead of image.';