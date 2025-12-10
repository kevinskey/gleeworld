-- Now Playing Override table
CREATE TABLE public.gw_radio_now_playing_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  art_url TEXT,
  is_active BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Playlist Schedule table
CREATE TABLE public.gw_radio_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.gw_radio_channels(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_radio_now_playing_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_radio_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies for now playing override
CREATE POLICY "Anyone can view active now playing override"
ON public.gw_radio_now_playing_override
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage now playing override"
ON public.gw_radio_now_playing_override
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS policies for schedule
CREATE POLICY "Anyone can view radio schedule"
ON public.gw_radio_schedule
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage radio schedule"
ON public.gw_radio_schedule
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_gw_radio_now_playing_override_updated_at
BEFORE UPDATE ON public.gw_radio_now_playing_override
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_radio_schedule_updated_at
BEFORE UPDATE ON public.gw_radio_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();