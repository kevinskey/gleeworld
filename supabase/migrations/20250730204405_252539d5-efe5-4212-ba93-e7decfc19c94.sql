-- Remove the recursive super admin policy
DROP POLICY IF EXISTS "gw_profiles_superadmin_all" ON public.gw_profiles;

-- Create a simple admin policy that doesn't cause recursion
-- This allows any authenticated user to read basic profile info needed for executive board functionality
CREATE POLICY "gw_profiles_read_for_exec_board" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT user_id FROM public.gw_executive_board_members WHERE is_active = true
  )
);