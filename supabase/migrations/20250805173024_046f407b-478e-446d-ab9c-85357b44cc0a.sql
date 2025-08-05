-- Create radio_schedule table to store scheduled tracks
CREATE TABLE public.radio_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  title TEXT NOT NULL,
  artist_info TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  category TEXT DEFAULT 'performance',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scheduled_date, scheduled_time)
);

-- Enable RLS
ALTER TABLE public.radio_schedule ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view radio schedule"
ON public.radio_schedule 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create schedule entries"
ON public.radio_schedule 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own schedule entries"
ON public.radio_schedule 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own schedule entries"
ON public.radio_schedule 
FOR DELETE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all schedule entries"
ON public.radio_schedule 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_radio_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_radio_schedule_updated_at
  BEFORE UPDATE ON public.radio_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_radio_schedule_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_schedule;