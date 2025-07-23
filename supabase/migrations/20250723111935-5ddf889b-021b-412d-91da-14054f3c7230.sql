-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for story images
CREATE POLICY "Anyone can view story images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'story-images');

CREATE POLICY "Users can upload their own story images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own story images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own story images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create story_images table for multiple images per story
CREATE TABLE IF NOT EXISTS public.story_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.alumnae_stories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on story_images
ALTER TABLE public.story_images ENABLE ROW LEVEL SECURITY;

-- Create policies for story_images
CREATE POLICY "Anyone can view story images" 
ON public.story_images 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own story images" 
ON public.story_images 
FOR ALL 
USING (auth.uid() = created_by);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_story_images_story_id ON public.story_images(story_id);
CREATE INDEX IF NOT EXISTS idx_story_images_display_order ON public.story_images(story_id, display_order);