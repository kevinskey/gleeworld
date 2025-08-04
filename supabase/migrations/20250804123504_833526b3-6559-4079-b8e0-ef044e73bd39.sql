-- Drop the problematic storage policies that cause recursion
DROP POLICY IF EXISTS "Authenticated users can upload to user-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in user-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files and admins view all in user-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files and admins delete any in user-files" ON storage.objects;

-- Create simpler storage policies that don't reference gw_profiles to avoid recursion
-- Allow all authenticated users to upload to user-files (simpler approach)
CREATE POLICY "Allow authenticated uploads to user-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-files');

-- Allow users to update their own files (using simple auth.uid() check)
CREATE POLICY "Allow authenticated updates to user-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own files (using simple auth.uid() check)
CREATE POLICY "Allow authenticated selects from user-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files (using simple auth.uid() check)
CREATE POLICY "Allow authenticated deletes from user-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);