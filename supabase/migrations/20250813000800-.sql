-- Fix the search path issue for the function and make it more explicit
-- Drop the existing policy and function to recreate them properly
DROP POLICY IF EXISTS "Users with auditions access can view auditioner profiles" ON public.gw_profiles;
DROP FUNCTION IF EXISTS public.can_view_auditioner_profiles();

-- Create a more robust security definer function with proper search path
CREATE OR REPLACE FUNCTION public.can_view_auditioner_profiles()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
BEGIN
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
  
  -- Check if user has username permission for auditions
  -- Using a direct email check since auth.email() should work in SECURITY DEFINER context
  IF EXISTS (
    SELECT 1 FROM public.username_permissions up
    WHERE up.user_email = auth.email()
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create the policy with better scoping
CREATE POLICY "Users with auditions access can view auditioner profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing auditioner profiles if user has auditions access
  (gw_profiles.role = 'auditioner' AND public.can_view_auditioner_profiles())
);