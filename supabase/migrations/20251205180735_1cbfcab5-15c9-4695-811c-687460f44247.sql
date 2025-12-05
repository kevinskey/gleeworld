
-- Drop the existing admin policy on user_roles that only checks user_roles table
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Create a security definer function that checks admin status from gw_profiles OR user_roles
CREATE OR REPLACE FUNCTION public.is_role_admin()
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
  ) OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
$$;

-- Create new policies that use the combined admin check
CREATE POLICY "Admins can manage roles" ON user_roles
FOR ALL
TO authenticated
USING (is_role_admin())
WITH CHECK (is_role_admin());

CREATE POLICY "Admins can view all roles" ON user_roles
FOR SELECT
TO authenticated
USING (is_role_admin());
