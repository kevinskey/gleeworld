-- Create missing INSERT policies for media library buckets

-- Insert policy for media-library bucket (general access for authenticated users)
CREATE POLICY "Allow authenticated users to insert media files"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-library' 
  AND auth.uid() IS NOT NULL
);

-- Insert policy for media-audio bucket (user-owned content)
CREATE POLICY "media-audio insert by authenticated users"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Insert policy for media-docs bucket (user-owned content)
CREATE POLICY "media-docs insert by authenticated users"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-docs' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);