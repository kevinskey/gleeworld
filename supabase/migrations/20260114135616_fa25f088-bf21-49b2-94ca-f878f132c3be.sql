-- Create youtube_playlists table
CREATE TABLE public.youtube_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  playlist_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_playlists ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view playlists"
  ON public.youtube_playlists
  FOR SELECT
  USING (true);

-- Admin/instructor insert/update/delete
CREATE POLICY "Authenticated users can manage playlists"
  ON public.youtube_playlists
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_youtube_playlists_channel_id ON public.youtube_playlists(channel_id);
CREATE INDEX idx_youtube_playlists_playlist_id ON public.youtube_playlists(playlist_id);

-- Add updated_at trigger
CREATE TRIGGER update_youtube_playlists_updated_at
  BEFORE UPDATE ON public.youtube_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();