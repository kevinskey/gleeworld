-- Create missing INSERT policy for media-library bucket only
CREATE POLICY "Allow authenticated users to insert media files"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-library' 
  AND auth.uid() IS NOT NULL
);