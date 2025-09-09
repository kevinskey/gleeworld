-- Ensure media-library bucket exists for bulk uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-library', 'media-library', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for media-library bucket
CREATE POLICY "Authenticated users can view media library files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media-library');

CREATE POLICY "Admins can upload to media library" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update media library files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete media library files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media-library' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);