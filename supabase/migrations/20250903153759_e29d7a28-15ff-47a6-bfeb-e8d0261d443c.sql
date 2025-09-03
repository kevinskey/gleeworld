-- Create storage bucket for MUS240 audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('mus240-audio', 'mus240-audio', true);

-- Create policies for MUS240 audio bucket
CREATE POLICY "Anyone can view MUS240 audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'mus240-audio');

CREATE POLICY "Authenticated users can upload MUS240 audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'mus240-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their MUS240 audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'mus240-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their MUS240 audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'mus240-audio' AND auth.role() = 'authenticated');

-- Create table for audio resource metadata
CREATE TABLE public.mus240_audio_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'ai-music',
  duration INTEGER, -- in seconds
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mus240_audio_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for audio resources
CREATE POLICY "Anyone can view audio resources" 
ON public.mus240_audio_resources 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create audio resources" 
ON public.mus240_audio_resources 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own audio resources" 
ON public.mus240_audio_resources 
FOR UPDATE 
USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own audio resources" 
ON public.mus240_audio_resources 
FOR DELETE 
USING (uploaded_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_mus240_audio_resources_updated_at
BEFORE UPDATE ON public.mus240_audio_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();