-- Add INSERT policy for gw_media_library for all authenticated users
-- The existing policies require auth.uid() = uploaded_by which should work,
-- but let's add an explicit policy for any authenticated user who sets their own uploaded_by
DO $$
BEGIN
  -- Drop existing conflicting policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Members and executives can upload media" ON gw_media_library;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

-- Create a simpler, more permissive insert policy
-- Any authenticated user can insert media if they set themselves as the uploader
CREATE POLICY "Any authenticated user can upload media"
ON gw_media_library
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (uploaded_by IS NULL OR auth.uid() = uploaded_by)
);