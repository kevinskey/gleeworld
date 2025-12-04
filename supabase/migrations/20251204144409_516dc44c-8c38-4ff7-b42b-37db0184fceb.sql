-- Create table for categorized quick capture media
CREATE TABLE public.quick_capture_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('glee_cam_pic', 'voice_part_recording', 'exec_board_video', 'member_audition_video')),
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_capture_media ENABLE ROW LEVEL SECURITY;

-- Users can view their own media and approved media
CREATE POLICY "Users can view own media" 
ON public.quick_capture_media 
FOR SELECT 
USING (auth.uid() = user_id OR is_approved = true);

-- Users can insert their own media
CREATE POLICY "Users can insert own media" 
ON public.quick_capture_media 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own media
CREATE POLICY "Users can update own media" 
ON public.quick_capture_media 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own media
CREATE POLICY "Users can delete own media" 
ON public.quick_capture_media 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all media
CREATE POLICY "Admins can manage all media" 
ON public.quick_capture_media 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.role = 'admin' OR gw_profiles.role = 'super_admin')
  )
);

-- Create storage buckets for each category
INSERT INTO storage.buckets (id, name, public) VALUES ('quick-capture-media', 'quick-capture-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for quick capture media
CREATE POLICY "Anyone can view quick capture media"
ON storage.objects FOR SELECT
USING (bucket_id = 'quick-capture-media');

CREATE POLICY "Authenticated users can upload quick capture media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quick-capture-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own quick capture media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quick-capture-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own quick capture media"
ON storage.objects FOR DELETE
USING (bucket_id = 'quick-capture-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster category queries
CREATE INDEX idx_quick_capture_media_category ON public.quick_capture_media(category);
CREATE INDEX idx_quick_capture_media_user ON public.quick_capture_media(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_quick_capture_media_updated_at
BEFORE UPDATE ON public.quick_capture_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();