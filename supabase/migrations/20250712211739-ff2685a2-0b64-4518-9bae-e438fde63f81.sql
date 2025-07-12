-- Create music albums table
CREATE TABLE public.music_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_image_url TEXT,
  release_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create music tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_id UUID REFERENCES public.music_albums(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  track_number INTEGER,
  lyrics TEXT,
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  play_count INTEGER DEFAULT 0
);

-- Create track likes table
CREATE TABLE public.track_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, position)
);

-- Enable Row Level Security
ALTER TABLE public.music_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for music_albums
CREATE POLICY "Anyone can view music albums" ON public.music_albums FOR SELECT USING (true);
CREATE POLICY "Admins can manage music albums" ON public.music_albums FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

-- RLS Policies for music_tracks
CREATE POLICY "Anyone can view music tracks" ON public.music_tracks FOR SELECT USING (true);
CREATE POLICY "Admins can manage music tracks" ON public.music_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

-- RLS Policies for track_likes
CREATE POLICY "Users can view their own track likes" ON public.track_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own track likes" ON public.track_likes FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for playlists
CREATE POLICY "Anyone can view public playlists" ON public.playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own playlists" ON public.playlists FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create their own playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Admins can manage all playlists" ON public.playlists FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

-- RLS Policies for playlist_tracks
CREATE POLICY "Anyone can view public playlist tracks" ON public.playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_tracks.playlist_id AND is_public = true)
);
CREATE POLICY "Users can view their own playlist tracks" ON public.playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_tracks.playlist_id AND created_by = auth.uid())
);
CREATE POLICY "Users can manage their own playlist tracks" ON public.playlist_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_tracks.playlist_id AND created_by = auth.uid())
);
CREATE POLICY "Admins can manage all playlist tracks" ON public.playlist_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

-- Create function to update play count
CREATE OR REPLACE FUNCTION public.increment_play_count(track_uuid UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.music_tracks 
  SET play_count = play_count + 1 
  WHERE id = track_uuid;
$$;

-- Create function to get track like count
CREATE OR REPLACE FUNCTION public.get_track_like_count(track_uuid UUID)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.track_likes WHERE track_id = track_uuid;
$$;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_music()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_music_albums_updated_at
    BEFORE UPDATE ON public.music_albums
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_music();

CREATE TRIGGER update_music_tracks_updated_at
    BEFORE UPDATE ON public.music_tracks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_music();

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_music();