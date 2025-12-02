-- Clean up duplicate/conflicting UPDATE policies on gw_sheet_music
DROP POLICY IF EXISTS "Users can update own sheet music or admins can update any" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Librarians and admins can update sheet music" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can update their own sheet music" ON public.gw_sheet_music;

-- Create a single clean UPDATE policy using security definer function to avoid potential recursion
CREATE OR REPLACE FUNCTION public.can_update_sheet_music(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE gw_profiles.user_id = can_update_sheet_music.user_id 
    AND (is_admin = true OR is_super_admin = true OR role = 'librarian')
  )
$$;

-- Create single unified UPDATE policy
CREATE POLICY "Sheet music update policy" 
ON public.gw_sheet_music 
FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() 
  OR public.can_update_sheet_music(auth.uid())
)
WITH CHECK (
  created_by = auth.uid() 
  OR public.can_update_sheet_music(auth.uid())
);