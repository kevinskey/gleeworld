-- Create media library table to store metadata for uploaded files
CREATE TABLE IF NOT EXISTS public.gw_media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[],
  context TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_media_library ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public media is viewable by everyone" ON public.gw_media_library
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can view all media" ON public.gw_media_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upload media" ON public.gw_media_library
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own media" ON public.gw_media_library
  FOR UPDATE TO authenticated 
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all media" ON public.gw_media_library
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_gw_media_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_media_library_updated_at
  BEFORE UPDATE ON public.gw_media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_media_library_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_gw_media_library_category ON public.gw_media_library(category);
CREATE INDEX idx_gw_media_library_uploaded_by ON public.gw_media_library(uploaded_by);
CREATE INDEX idx_gw_media_library_is_public ON public.gw_media_library(is_public);
CREATE INDEX idx_gw_media_library_created_at ON public.gw_media_library(created_at);
CREATE INDEX idx_gw_media_library_tags ON public.gw_media_library USING GIN(tags);