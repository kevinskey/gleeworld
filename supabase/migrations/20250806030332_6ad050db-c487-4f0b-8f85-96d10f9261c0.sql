-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true);

-- Create media library table
CREATE TABLE public.gw_media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  bucket_name TEXT NOT NULL DEFAULT 'service-images',
  uploaded_by UUID,
  category TEXT DEFAULT 'service-image',
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for media library
ALTER TABLE public.gw_media_library ENABLE ROW LEVEL SECURITY;

-- Create policies for media library
CREATE POLICY "Anyone can view active media" 
ON public.gw_media_library 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can upload media" 
ON public.gw_media_library 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage all media" 
ON public.gw_media_library 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can update their own uploads" 
ON public.gw_media_library 
FOR UPDATE 
USING (uploaded_by = auth.uid());

-- Create storage policies for service images
CREATE POLICY "Anyone can view service images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated users can upload service images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own service images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'service-images' 
  AND auth.uid()::text = owner
);

CREATE POLICY "Admins can delete service images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'service-images' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger for media library
CREATE TRIGGER update_gw_media_library_updated_at
  BEFORE UPDATE ON public.gw_media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_media_library_updated_at();

-- Create function to handle media upload
CREATE OR REPLACE FUNCTION public.upload_service_image(
  p_filename TEXT,
  p_original_filename TEXT,
  p_file_path TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  media_id UUID;
  file_url TEXT;
BEGIN
  -- Generate the public URL
  file_url := 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/service-images/' || p_file_path;
  
  -- Insert into media library
  INSERT INTO public.gw_media_library (
    filename,
    original_filename,
    file_path,
    file_url,
    file_type,
    file_size,
    mime_type,
    uploaded_by,
    category,
    description
  ) VALUES (
    p_filename,
    p_original_filename,
    p_file_path,
    file_url,
    'image',
    p_file_size,
    p_mime_type,
    auth.uid(),
    'service-image',
    p_description
  ) RETURNING id INTO media_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'media_id', media_id,
    'file_url', file_url,
    'message', 'Image uploaded successfully'
  );
END;
$$;