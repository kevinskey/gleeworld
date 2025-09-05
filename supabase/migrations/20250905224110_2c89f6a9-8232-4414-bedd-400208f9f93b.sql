-- Fix the INSERT policy for gw_sheet_music that's trying to access auth.users
-- Replace the policy to use gw_profiles instead of auth.users

DROP POLICY IF EXISTS "Librarians can insert sheet music" ON public.gw_sheet_music;

CREATE POLICY "Librarians can insert sheet music" ON public.gw_sheet_music
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if user is admin, super admin, or has librarian role
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (
      is_admin = true 
      OR is_super_admin = true 
      OR role = 'librarian'
    )
  )
  -- Also allow username permissions for librarian module using email from gw_profiles
  OR has_username_permission(
    (SELECT email FROM public.gw_profiles WHERE user_id = auth.uid()),
    'librarian_dashboard'
  )
);