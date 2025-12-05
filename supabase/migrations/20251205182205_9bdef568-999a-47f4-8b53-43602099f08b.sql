
-- Drop the problematic recursive policy on user_roles_multi
DROP POLICY IF EXISTS "admins_can_manage_all_roles" ON user_roles_multi;

-- The urm_admin_all policy using is_super_admin() should be safe if that function is SECURITY DEFINER
-- Let's verify and simplify the policies to avoid any recursion

-- Create a safe function to check if current user is super admin via gw_profiles (not user_roles_multi)
CREATE OR REPLACE FUNCTION public.is_urm_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
$$;

-- Update the admin policy to use the safe function
DROP POLICY IF EXISTS "urm_admin_all" ON user_roles_multi;
CREATE POLICY "urm_admin_all" ON user_roles_multi
FOR ALL
TO authenticated
USING (is_urm_admin())
WITH CHECK (is_urm_admin());
