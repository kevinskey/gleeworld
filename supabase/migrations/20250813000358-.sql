-- Allow users with auditions access to view auditioner profiles
CREATE POLICY "Users with auditions access can view auditioner profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing auditioner profiles if user has auditions access
  (gw_profiles.role = 'auditioner' AND (
    -- User is admin/super admin
    EXISTS (
      SELECT 1 FROM gw_profiles viewer 
      WHERE viewer.user_id = auth.uid() 
      AND (viewer.is_admin = true OR viewer.is_super_admin = true)
    )
    -- User is executive board member
    OR EXISTS (
      SELECT 1 FROM gw_profiles viewer 
      WHERE viewer.user_id = auth.uid() 
      AND viewer.role = 'executive'
    )
    -- User has username permission for auditions
    OR EXISTS (
      SELECT 1 FROM username_permissions up
      WHERE up.user_email = auth.email()
      AND up.module_name = 'auditions'
      AND up.is_active = true
      AND (up.expires_at IS NULL OR up.expires_at > now())
    )
  ))
);