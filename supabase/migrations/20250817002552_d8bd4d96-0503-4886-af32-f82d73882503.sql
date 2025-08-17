-- Check current RLS policies for gw_media_library
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'gw_media_library';

-- Add comprehensive RLS policies for gw_media_library to ensure all audio files are accessible
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "gw_media_library_admin_all" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_public_select" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_authenticated_select" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_owner_select" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_insert_policy" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_update_policy" ON gw_media_library;
  DROP POLICY IF EXISTS "gw_media_library_delete_policy" ON gw_media_library;
  
  -- Create new comprehensive policies
  
  -- Admins can do everything
  CREATE POLICY "gw_media_library_admin_all" ON gw_media_library
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    );

  -- Authenticated users can view public files and their own files
  CREATE POLICY "gw_media_library_authenticated_select" ON gw_media_library
    FOR SELECT
    TO authenticated
    USING (
      is_public = true OR 
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    );

  -- Anonymous users can only view public files
  CREATE POLICY "gw_media_library_public_select" ON gw_media_library
    FOR SELECT
    TO anon
    USING (is_public = true);

  -- Users can insert their own files
  CREATE POLICY "gw_media_library_insert_policy" ON gw_media_library
    FOR INSERT
    TO authenticated
    WITH CHECK (uploaded_by = auth.uid());

  -- Users can update their own files (or admins can update any)
  CREATE POLICY "gw_media_library_update_policy" ON gw_media_library
    FOR UPDATE
    TO authenticated
    USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
    WITH CHECK (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    );

  -- Users can delete their own files (or admins can delete any)
  CREATE POLICY "gw_media_library_delete_policy" ON gw_media_library
    FOR DELETE
    TO authenticated
    USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    );

END $$;

-- Ensure RLS is enabled
ALTER TABLE gw_media_library ENABLE ROW LEVEL SECURITY;

-- Update the private audio files to be public so they can be played
UPDATE gw_media_library 
SET is_public = true 
WHERE file_type = 'audio/mpeg' 
AND bucket_id = 'media-audio' 
AND is_public = false;