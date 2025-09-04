-- Drop the problematic policy
DROP POLICY IF EXISTS "gw_profiles_treasurer_view_all" ON public.gw_profiles;

-- Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "gw_profiles_treasurer_view_all"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  )
  OR
  -- Allow users with treasurer role permissions
  EXISTS (
    SELECT 1 FROM public.username_permissions 
    WHERE user_email = public.get_current_user_email()
    AND module_name IN ('treasurer', 'dues-management')
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);