-- Add support for uploaded videos in dashboard video section
ALTER TABLE public.dashboard_youtube_videos 
ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'uploaded')),
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.dashboard_youtube_videos.video_type IS 'Type of video: youtube or uploaded';
COMMENT ON COLUMN public.dashboard_youtube_videos.video_url IS 'Direct URL for uploaded videos stored in Supabase storage';