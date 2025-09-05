-- Add missing INSERT policies for media-docs and media-audio buckets

CREATE POLICY "media-docs insert by authenticated users" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-docs' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "media-audio insert by authenticated users" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-audio' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);