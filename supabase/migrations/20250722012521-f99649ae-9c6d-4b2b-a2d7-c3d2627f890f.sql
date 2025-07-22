-- Create event_images table for handling multiple images per event
CREATE TABLE IF NOT EXISTS public.event_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.gw_events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_images
CREATE POLICY "Everyone can view event images" 
ON public.event_images 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage event images" 
ON public.event_images 
FOR ALL 
USING (auth.uid() IS NOT NULL);