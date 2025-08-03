-- Create radio episodes table for Glee World 101
CREATE TABLE IF NOT EXISTS public.gw_radio_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  episode_number INTEGER,
  season TEXT,
  published_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_published BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'episode' CHECK (category IN ('episode', 'performance', 'alumni_story', 'announcement', 'interlude')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create radio playlist table
CREATE TABLE IF NOT EXISTS public.gw_radio_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME,
  weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Sunday, 6 = Saturday
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create radio playlist items table
CREATE TABLE IF NOT EXISTS public.gw_radio_playlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES public.gw_radio_playlists(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.gw_radio_episodes(id) ON DELETE CASCADE,
  audio_archive_id UUID REFERENCES public.audio_archive(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  scheduled_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create radio stats table
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID REFERENCES public.gw_radio_episodes(id) ON DELETE CASCADE,
  play_count INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  total_listen_time INTEGER DEFAULT 0, -- in seconds
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_radio_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_radio_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_radio_playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_radio_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for radio episodes
CREATE POLICY "Anyone can view published radio episodes" 
ON public.gw_radio_episodes 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Authenticated users can view all radio episodes" 
ON public.gw_radio_episodes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can create radio episodes" 
ON public.gw_radio_episodes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('member', 'executive', 'admin', 'super-admin', 'alumna')
  )
);

CREATE POLICY "Creators and admins can update radio episodes" 
ON public.gw_radio_episodes 
FOR UPDATE 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Creators and admins can delete radio episodes" 
ON public.gw_radio_episodes 
FOR DELETE 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for radio playlists
CREATE POLICY "Authenticated users can view radio playlists" 
ON public.gw_radio_playlists 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and executives can manage radio playlists" 
ON public.gw_radio_playlists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'executive')
  )
);

-- RLS Policies for radio playlist items
CREATE POLICY "Authenticated users can view radio playlist items" 
ON public.gw_radio_playlist_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and executives can manage radio playlist items" 
ON public.gw_radio_playlist_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'executive')
  )
);

-- RLS Policies for radio stats
CREATE POLICY "Authenticated users can view radio stats" 
ON public.gw_radio_stats 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert radio stats" 
ON public.gw_radio_stats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update radio stats" 
ON public.gw_radio_stats 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_gw_radio_episodes_published ON public.gw_radio_episodes(is_published, published_date DESC);
CREATE INDEX idx_gw_radio_episodes_category ON public.gw_radio_episodes(category);
CREATE INDEX idx_gw_radio_playlist_items_playlist ON public.gw_radio_playlist_items(playlist_id, position);
CREATE INDEX idx_gw_radio_stats_episode ON public.gw_radio_stats(episode_id, date);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_radio_episodes_updated_at 
    BEFORE UPDATE ON public.gw_radio_episodes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_radio_playlists_updated_at 
    BEFORE UPDATE ON public.gw_radio_playlists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();