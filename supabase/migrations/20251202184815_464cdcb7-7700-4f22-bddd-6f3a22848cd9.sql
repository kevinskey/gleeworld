-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Authenticated users can update their own sheet music" ON public.gw_sheet_music;

-- Create a new policy that allows users to update their own OR admins to update any
CREATE POLICY "Users can update own sheet music or admins can update any" 
ON public.gw_sheet_music 
FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);