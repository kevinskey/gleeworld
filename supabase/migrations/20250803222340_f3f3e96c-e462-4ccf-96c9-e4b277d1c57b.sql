-- Create playlists table
CREATE TABLE public.radio_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create playlist tracks junction table
CREATE TABLE public.radio_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES public.radio_playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL, -- Can reference music_tracks or audio_archive
  track_source TEXT NOT NULL DEFAULT 'music_tracks', -- 'music_tracks' or 'audio_archive'
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.radio_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for playlists
CREATE POLICY "Users can view public playlists or their own playlists"
ON public.radio_playlists FOR SELECT
USING (is_public = true OR created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can create their own playlists"
ON public.radio_playlists FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own playlists"
ON public.radio_playlists FOR UPDATE
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can delete their own playlists"
ON public.radio_playlists FOR DELETE
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for playlist tracks
CREATE POLICY "Users can view tracks in accessible playlists"
ON public.radio_playlist_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM radio_playlists rp 
  WHERE rp.id = playlist_id 
  AND (rp.is_public = true OR rp.created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  ))
));

CREATE POLICY "Users can add tracks to their playlists"
ON public.radio_playlist_tracks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM radio_playlists rp 
  WHERE rp.id = playlist_id AND rp.created_by = auth.uid()
) OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can update tracks in their playlists"
ON public.radio_playlist_tracks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM radio_playlists rp 
  WHERE rp.id = playlist_id AND rp.created_by = auth.uid()
) OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can delete tracks from their playlists"
ON public.radio_playlist_tracks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM radio_playlists rp 
  WHERE rp.id = playlist_id AND rp.created_by = auth.uid()
) OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

-- Add updated_at trigger for playlists
CREATE OR REPLACE FUNCTION update_radio_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_radio_playlists_updated_at
  BEFORE UPDATE ON public.radio_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_radio_playlists_updated_at();