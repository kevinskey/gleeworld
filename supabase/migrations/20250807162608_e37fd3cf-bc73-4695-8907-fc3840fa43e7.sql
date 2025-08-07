-- Create table to store real-time radio station state
CREATE TABLE public.gw_radio_station_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id TEXT NOT NULL UNIQUE,
  station_name TEXT,
  is_online BOOLEAN DEFAULT false,
  is_live BOOLEAN DEFAULT false,
  streamer_name TEXT,
  listener_count INTEGER DEFAULT 0,
  current_song_title TEXT,
  current_song_artist TEXT,
  current_song_album TEXT,
  current_song_art TEXT,
  song_started_at TIMESTAMP WITH TIME ZONE,
  last_event_type TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_radio_station_state ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (radio data is public)
CREATE POLICY "Radio station state is publicly readable" 
ON public.gw_radio_station_state 
FOR SELECT 
USING (true);

-- Create policy to allow the webhook to update data
CREATE POLICY "System can update radio station state" 
ON public.gw_radio_station_state 
FOR ALL
USING (true)
WITH CHECK (true);

-- Add the table to realtime publication for instant updates
ALTER TABLE public.gw_radio_station_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_radio_station_state;

-- Insert initial state for Glee World Radio
INSERT INTO public.gw_radio_station_state (
  station_id, 
  station_name, 
  is_online, 
  is_live, 
  listener_count
) VALUES (
  'glee_world_radio', 
  'Glee World Radio', 
  false, 
  false, 
  0
) ON CONFLICT (station_id) DO NOTHING;