-- Create storage policies for pr-images bucket

-- Allow PR coordinators and admins to upload PR images
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('pr-images', '', null, '{}') ON CONFLICT DO NOTHING;

-- Create policies for pr-images bucket
CREATE POLICY "PR coordinators and admins can upload PR images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can view PR images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can update PR images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can delete PR images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pr-images' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);