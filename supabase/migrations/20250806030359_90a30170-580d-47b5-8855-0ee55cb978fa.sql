-- Create storage bucket for service images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

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