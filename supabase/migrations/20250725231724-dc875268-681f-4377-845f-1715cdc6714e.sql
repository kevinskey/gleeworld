-- Make user-files bucket public to allow dashboard background images to be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'user-files';

-- Create storage policies for dashboard background images
CREATE POLICY "Dashboard background images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-files' AND name LIKE '%/dashboard-backgrounds/%');

-- Allow admins to upload dashboard background images
CREATE POLICY "Admins can upload dashboard background images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-files' 
  AND name LIKE '%/dashboard-backgrounds/%'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);