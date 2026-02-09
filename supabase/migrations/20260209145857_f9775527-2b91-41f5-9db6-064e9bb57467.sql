
-- Add video_url column for uploaded video support
ALTER TABLE public.gw_universal_slider_slides
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.gw_universal_slider_slides.video_url IS 'URL for uploaded video files (stored in Supabase storage)';
