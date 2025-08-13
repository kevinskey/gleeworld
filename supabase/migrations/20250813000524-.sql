-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users with auditions access can view auditioner profiles" ON public.gw_profiles;

-- Create a security definer function to check if user can view auditioner profiles
CREATE OR REPLACE FUNCTION public.can_view_auditioner_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin/super admin
  IF EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is executive board member
  IF EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'executive'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has username permission for auditions
  IF EXISTS (
    SELECT 1 FROM username_permissions up
    WHERE up.user_email = auth.email()
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create the corrected policy using the security definer function
CREATE POLICY "Users with auditions access can view auditioner profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing auditioner profiles if user has auditions access
  (gw_profiles.role = 'auditioner' AND public.can_view_auditioner_profiles())
);