-- Add policy for admins to upload hero images to user-files bucket
CREATE POLICY "Admins can upload to user-files bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'user-files' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Add policy for admins to update files in user-files bucket
CREATE POLICY "Admins can update user-files bucket"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'user-files' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  bucket_id = 'user-files' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Add policy for admins to delete files in user-files bucket
CREATE POLICY "Admins can delete from user-files bucket"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'user-files' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);