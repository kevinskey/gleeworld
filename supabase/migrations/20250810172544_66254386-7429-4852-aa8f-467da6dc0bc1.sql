-- Storage policies for selfie uploads to user-files bucket
BEGIN;

-- INSERT policy
DROP POLICY IF EXISTS "Users can upload to their own folder in user-files" ON storage.objects;
CREATE POLICY "Users can upload to their own folder in user-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT policy
DROP POLICY IF EXISTS "Users can read their own files in user-files" ON storage.objects;
CREATE POLICY "Users can read their own files in user-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update their own files in user-files" ON storage.objects;
CREATE POLICY "Users can update their own files in user-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE policy
DROP POLICY IF EXISTS "Users can delete their own files in user-files" ON storage.objects;
CREATE POLICY "Users can delete their own files in user-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;