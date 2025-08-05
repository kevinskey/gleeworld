-- Create Shoutcast streams management table
CREATE TABLE public.gw_shoutcast_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stream_url TEXT NOT NULL,
  mount_point TEXT NOT NULL,
  port INTEGER DEFAULT 8000,
  admin_password TEXT,
  dj_password TEXT,
  source_password TEXT,
  max_listeners INTEGER DEFAULT 100,
  genre TEXT,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Shoutcast statistics table
CREATE TABLE public.gw_shoutcast_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.gw_shoutcast_streams(id) ON DELETE CASCADE,
  current_listeners INTEGER DEFAULT 0,
  peak_listeners INTEGER DEFAULT 0,
  total_listeners INTEGER DEFAULT 0,
  current_song TEXT,
  stream_start_time TIMESTAMP WITH TIME ZONE,
  bitrate INTEGER,
  sample_rate INTEGER,
  stream_status TEXT DEFAULT 'offline',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Shoutcast playlists table
CREATE TABLE public.gw_shoutcast_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.gw_shoutcast_streams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  shuffle_enabled BOOLEAN DEFAULT true,
  repeat_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Shoutcast playlist tracks table
CREATE TABLE public.gw_shoutcast_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES public.gw_shoutcast_playlists(id) ON DELETE CASCADE,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_album TEXT,
  file_path TEXT NOT NULL,
  duration_seconds INTEGER,
  play_order INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_shoutcast_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_shoutcast_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_shoutcast_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_shoutcast_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for streams
CREATE POLICY "Admins can manage all shoutcast streams" ON public.gw_shoutcast_streams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Public can view public streams" ON public.gw_shoutcast_streams
  FOR SELECT USING (is_public = true);

-- Create RLS policies for stats
CREATE POLICY "Admins can manage all shoutcast stats" ON public.gw_shoutcast_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Public can view stats for public streams" ON public.gw_shoutcast_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_shoutcast_streams s
      WHERE s.id = stream_id AND s.is_public = true
    )
  );

-- Create RLS policies for playlists
CREATE POLICY "Admins can manage all shoutcast playlists" ON public.gw_shoutcast_playlists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create RLS policies for playlist tracks
CREATE POLICY "Admins can manage all playlist tracks" ON public.gw_shoutcast_playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_shoutcast_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_shoutcast_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_shoutcast_streams_updated_at
  BEFORE UPDATE ON public.gw_shoutcast_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shoutcast_streams_updated_at();

CREATE TRIGGER update_gw_shoutcast_playlists_updated_at
  BEFORE UPDATE ON public.gw_shoutcast_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shoutcast_playlists_updated_at();