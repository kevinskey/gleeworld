-- Create comprehensive storage policies for user-files bucket to allow MP3 uploads

-- Allow authenticated users to insert (upload) files to user-files bucket
CREATE POLICY "Authenticated users can upload to user-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-files');

-- Allow authenticated users to update their own files in user-files bucket
CREATE POLICY "Users can update their own files in user-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own files and admins to view all files
CREATE POLICY "Users can view their own files and admins view all in user-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

-- Allow users to delete their own files and admins to delete any files
CREATE POLICY "Users can delete their own files and admins delete any in user-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);