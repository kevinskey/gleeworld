-- Drop conflicting policies
DROP POLICY IF EXISTS "gw_profiles_admin_safe" ON public.gw_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.gw_profiles;

-- Create a single clean UPDATE policy that allows:
-- 1. Users to update their own profile
-- 2. Admins (via is_gw_admin_safe SECURITY DEFINER function) to update any profile
CREATE POLICY "gw_profiles_update_policy" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() OR is_gw_admin_safe()
)
WITH CHECK (
  user_id = auth.uid() OR is_gw_admin_safe()
);