-- Fix sheet-music bucket access issues
-- Remove conflicting policies and create consistent access rules

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view accessible sheet music files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view sheet music" ON storage.objects;

-- Create unified sheet music access policy for SELECT operations
CREATE POLICY "Users can view sheet music they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sheet-music' AND (
    -- Allow admins and super-admins to access all files
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow file owners to access their files
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Allow users with sheet music permissions
    EXISTS (
      SELECT 1 FROM gw_sheet_music sm
      WHERE sm.pdf_url LIKE '%' || objects.name
      AND (
        sm.is_public = true 
        OR sm.created_by = auth.uid()
        OR user_can_access_sheet_music(sm.id, auth.uid())
      )
    )
  )
);