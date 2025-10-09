
-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Members can access sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Anyone can view public sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Public can view public sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Users can view their own sheet music" ON public.gw_sheet_music;

-- Create a simple, inclusive policy for all authenticated members
CREATE POLICY "All authenticated members can view all sheet music"
ON public.gw_sheet_music
FOR SELECT
TO authenticated
USING (
  -- All authenticated users can view non-archived sheet music
  is_archived = false
);

-- Keep the admin/creator management policy as-is
-- (already exists: "Admins can manage sheet music")

-- Keep the librarian insert policy as-is  
-- (already exists: "Librarians can insert sheet music")

-- Add a simple update policy for librarians and admins
DROP POLICY IF EXISTS "Librarians can update sheet music" ON public.gw_sheet_music;
CREATE POLICY "Librarians and admins can update sheet music"
ON public.gw_sheet_music
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = 'librarian'
    )
  )
  OR has_username_permission(
    (SELECT email FROM public.gw_profiles WHERE user_id = auth.uid()),
    'librarian_dashboard'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = 'librarian'
    )
  )
  OR has_username_permission(
    (SELECT email FROM public.gw_profiles WHERE user_id = auth.uid()),
    'librarian_dashboard'
  )
);

-- Add a delete policy for admins only
DROP POLICY IF EXISTS "Admins can delete sheet music" ON public.gw_sheet_music;
CREATE POLICY "Admins can delete sheet music"
ON public.gw_sheet_music
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Simplify sheet music permissions table policies
DROP POLICY IF EXISTS "Users can view permissions for their accessible sheet music" ON public.gw_sheet_music_permissions;
CREATE POLICY "All members can view permissions"
ON public.gw_sheet_music_permissions
FOR SELECT
TO authenticated
USING (true);

-- Comment for clarity
COMMENT ON POLICY "All authenticated members can view all sheet music" ON public.gw_sheet_music IS 
  'Allows all authenticated Glee Club members to view all non-archived sheet music in the library. This ensures everyone has access to the music they need for rehearsals and performances.';
