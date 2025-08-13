-- Drop the policy first, then the function, then recreate both
DROP POLICY IF EXISTS "Users with auditions access can view auditioner profiles" ON public.gw_profiles;
DROP FUNCTION IF EXISTS public.can_view_auditioner_profiles();

-- Create improved function that gets email from gw_profiles table
CREATE OR REPLACE FUNCTION public.can_view_auditioner_profiles()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_email_addr TEXT;
BEGIN
  -- Get the current user's ID
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin/super admin
  IF EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is executive board member
  IF EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'executive'
  ) THEN
    RETURN true;
  END IF;
  
  -- Get user's email from gw_profiles table
  SELECT email INTO user_email_addr
  FROM public.gw_profiles 
  WHERE user_id = auth.uid();
  
  -- Check if user has username permission for auditions using their email
  IF user_email_addr IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.username_permissions up
    WHERE up.user_email = user_email_addr
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate the policy
CREATE POLICY "Users with auditions access can view auditioner profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing auditioner profiles if user has auditions access
  (gw_profiles.role = 'auditioner' AND public.can_view_auditioner_profiles())
);