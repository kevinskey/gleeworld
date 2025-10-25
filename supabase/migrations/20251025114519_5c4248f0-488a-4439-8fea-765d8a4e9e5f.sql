-- Create karaoke_recordings table
CREATE TABLE IF NOT EXISTS public.karaoke_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Karaoke Recording',
  audio_url TEXT NOT NULL,
  audio_duration INTEGER,
  file_path TEXT NOT NULL,
  song_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.karaoke_recordings ENABLE ROW LEVEL SECURITY;

-- Policies for karaoke_recordings
CREATE POLICY "Users can view their own karaoke recordings"
ON public.karaoke_recordings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public karaoke recordings"
ON public.karaoke_recordings
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create their own karaoke recordings"
ON public.karaoke_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own karaoke recordings"
ON public.karaoke_recordings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own karaoke recordings"
ON public.karaoke_recordings
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_karaoke_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_karaoke_recordings_timestamp
BEFORE UPDATE ON public.karaoke_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_karaoke_recordings_updated_at();