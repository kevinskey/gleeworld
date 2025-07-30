-- Create storage policies for pr-images bucket access

-- Allow authenticated users to view PR images (since this is for admins/PR coordinators)
CREATE POLICY "Allow viewing PR images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pr-images');

-- Allow PR coordinators and admins to upload PR images
CREATE POLICY "Allow uploading PR images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Allow PR coordinators and admins to update PR images
CREATE POLICY "Allow updating PR images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Allow PR coordinators and admins to delete PR images
CREATE POLICY "Allow deleting PR images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);