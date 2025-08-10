-- Storage policies for user selfie uploads in user-files bucket
-- Let users upload/read/update/delete files in their own folder: <user_id>/...

BEGIN;

-- INSERT policy: user can upload into their own folder
CREATE POLICY IF NOT EXISTS "Users can upload to their own folder in user-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT policy: user can read files in their own folder (needed for signed URLs)
CREATE POLICY IF NOT EXISTS "Users can read their own files in user-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE policy: allow users to overwrite their own files (optional but useful)
CREATE POLICY IF NOT EXISTS "Users can update their own files in user-files"
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

-- DELETE policy: allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete their own files in user-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;