-- Add INSERT policy for sheet music table to allow librarians to add scores

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
  -- Also allow username permissions for librarian module
  OR has_username_permission(
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'librarian_dashboard'
  )
);