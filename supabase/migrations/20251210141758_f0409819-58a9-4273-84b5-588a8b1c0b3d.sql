-- Create table for radio channels/playlists
CREATE TABLE public.gw_radio_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stream_url TEXT NOT NULL,
  icon TEXT, -- lucide icon name
  color TEXT, -- hex color for the channel badge
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_radio_channels ENABLE ROW LEVEL SECURITY;

-- Everyone can read channels
CREATE POLICY "Anyone can view active radio channels"
ON public.gw_radio_channels
FOR SELECT
USING (is_active = true);

-- Only admins can manage channels
CREATE POLICY "Admins can manage radio channels"
ON public.gw_radio_channels
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Insert default channels (you can customize these based on your AzuraCast setup)
INSERT INTO public.gw_radio_channels (name, description, stream_url, icon, color, sort_order, is_default) VALUES
('Main Mix', 'Our curated mix of Glee Club favorites', 'https://radio.gleeworld.org/listen/glee_world_radio/radio.mp3', 'Radio', '#7BAFD4', 1, true),
('Gospel', 'Spirituals and gospel arrangements', 'https://radio.gleeworld.org/listen/glee_world_radio/gospel.mp3', 'Church', '#9333ea', 2, false),
('Classical', 'Classical and traditional choral works', 'https://radio.gleeworld.org/listen/glee_world_radio/classical.mp3', 'Music2', '#059669', 3, false),
('Contemporary', 'Modern arrangements and popular songs', 'https://radio.gleeworld.org/listen/glee_world_radio/contemporary.mp3', 'Sparkles', '#ea580c', 4, false);

-- Add trigger for updated_at
CREATE TRIGGER update_gw_radio_channels_updated_at
BEFORE UPDATE ON public.gw_radio_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();