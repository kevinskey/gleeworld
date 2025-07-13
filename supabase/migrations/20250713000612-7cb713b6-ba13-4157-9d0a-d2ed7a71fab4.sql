-- Add RLS policies for music tables

-- Enable RLS on music_tracks table
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on music_albums table  
ALTER TABLE public.music_albums ENABLE ROW LEVEL SECURITY;

-- Create policies for music_tracks
CREATE POLICY "Anyone can view music tracks" ON public.music_tracks FOR SELECT USING (true);

CREATE POLICY "Super admins can manage music tracks" ON public.music_tracks 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super-admin'
  )
);

-- Create policies for music_albums
CREATE POLICY "Anyone can view music albums" ON public.music_albums FOR SELECT USING (true);

CREATE POLICY "Super admins can manage music albums" ON public.music_albums 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super-admin'
  )
);

-- Create track_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.track_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS on track_likes
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

-- Policies for track_likes
CREATE POLICY "Users can view all track likes" ON public.track_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own track likes" ON public.track_likes 
FOR ALL USING (auth.uid() = user_id);