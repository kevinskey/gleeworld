-- Create table for dashboard YouTube videos (two-column feature)
CREATE TABLE public.dashboard_youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position VARCHAR(10) NOT NULL CHECK (position IN ('left', 'right')),
  video_id VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  autoplay BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(position)
);

-- Enable RLS
ALTER TABLE public.dashboard_youtube_videos ENABLE ROW LEVEL SECURITY;

-- Everyone can view active videos
CREATE POLICY "Anyone can view active dashboard videos"
ON public.dashboard_youtube_videos
FOR SELECT
USING (is_active = true);

-- Admins can manage videos
CREATE POLICY "Admins can manage dashboard videos"
ON public.dashboard_youtube_videos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_youtube_videos_updated_at
BEFORE UPDATE ON public.dashboard_youtube_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();