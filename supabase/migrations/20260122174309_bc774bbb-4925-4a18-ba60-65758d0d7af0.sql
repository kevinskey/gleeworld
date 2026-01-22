
-- Create table for YouTube channel videos
CREATE TABLE public.youtube_channel_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_id TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.youtube_channel_videos ENABLE ROW LEVEL SECURITY;

-- Public read access for active videos
CREATE POLICY "Anyone can view active videos"
ON public.youtube_channel_videos
FOR SELECT
USING (is_active = true);

-- Admins can manage videos
CREATE POLICY "Admins can manage videos"
ON public.youtube_channel_videos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Insert some sample videos
INSERT INTO public.youtube_channel_videos (title, video_id, display_order) VALUES
('Spelman Glee Club Performance', 'YOUR_VIDEO_ID_1', 1),
('Christmas Concert Highlights', 'YOUR_VIDEO_ID_2', 2),
('Spring Tour 2025', 'YOUR_VIDEO_ID_3', 3);
