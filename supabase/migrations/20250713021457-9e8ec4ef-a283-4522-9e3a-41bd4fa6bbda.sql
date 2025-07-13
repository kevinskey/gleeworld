-- Create YouTube management tables
CREATE TABLE public.youtube_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_handle TEXT,
  channel_name TEXT NOT NULL,
  channel_description TEXT,
  channel_url TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  auto_sync BOOLEAN DEFAULT false,
  featured_video_count INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for youtube_channels
CREATE POLICY "Admins can manage YouTube channels" 
ON public.youtube_channels 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'super-admin')
));

CREATE POLICY "Everyone can view YouTube channels" 
ON public.youtube_channels 
FOR SELECT 
USING (true);

-- Create policies for youtube_videos
CREATE POLICY "Admins can manage YouTube videos" 
ON public.youtube_videos 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'super-admin')
));

CREATE POLICY "Everyone can view YouTube videos" 
ON public.youtube_videos 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_youtube_videos_channel_id ON public.youtube_videos(channel_id);
CREATE INDEX idx_youtube_videos_video_id ON public.youtube_videos(video_id);
CREATE INDEX idx_youtube_videos_featured ON public.youtube_videos(is_featured);
CREATE INDEX idx_youtube_videos_published_at ON public.youtube_videos(published_at DESC);

-- Create updated_at triggers
CREATE TRIGGER update_youtube_channels_updated_at
  BEFORE UPDATE ON public.youtube_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON public.youtube_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();