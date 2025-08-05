-- Create a table to manage the global radio state
CREATE TABLE public.radio_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_track_id UUID REFERENCES public.audio_archive(id),
  current_track_title TEXT,
  current_track_artist TEXT,
  playback_position_seconds NUMERIC DEFAULT 0,
  is_playing BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.radio_state ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read radio state
CREATE POLICY "Anyone can read radio state" 
ON public.radio_state 
FOR SELECT 
USING (true);

-- Only admins can update radio state
CREATE POLICY "Admins can update radio state" 
ON public.radio_state 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Insert initial radio state
INSERT INTO public.radio_state (id, is_playing, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000001', false, now());

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE radio_state;

-- Set replica identity for real-time updates
ALTER TABLE public.radio_state REPLICA IDENTITY FULL;