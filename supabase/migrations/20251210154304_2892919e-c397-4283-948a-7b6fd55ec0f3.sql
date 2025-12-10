-- Create radio playlist queue table for easy drag-and-drop management
CREATE TABLE public.gw_radio_playlist_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_info TEXT,
  audio_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'performance',
  duration_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_radio_playlist_queue ENABLE ROW LEVEL SECURITY;

-- Admin/exec board can manage playlist
CREATE POLICY "Admins can manage radio playlist"
ON public.gw_radio_playlist_queue
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- Everyone can view the playlist
CREATE POLICY "Everyone can view radio playlist"
ON public.gw_radio_playlist_queue
FOR SELECT
USING (true);

-- Create index for efficient sorting
CREATE INDEX idx_radio_playlist_sort ON public.gw_radio_playlist_queue(category, sort_order);
CREATE INDEX idx_radio_playlist_active ON public.gw_radio_playlist_queue(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_gw_radio_playlist_queue_updated_at
BEFORE UPDATE ON public.gw_radio_playlist_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();