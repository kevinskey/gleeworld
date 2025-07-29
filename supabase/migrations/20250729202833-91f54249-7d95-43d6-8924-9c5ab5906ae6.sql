-- Fix RLS policies for gw_profiles table to avoid circular references
-- Drop the problematic admin policy that references profiles table
DROP POLICY IF EXISTS "gw_profiles_admin_all" ON public.gw_profiles;

-- Create new admin policy that checks gw_profiles directly for admin status
CREATE POLICY "gw_profiles_admin_access" 
ON public.gw_profiles 
FOR ALL 
TO authenticated 
USING (
  -- Allow users to access their own profile
  user_id = auth.uid() 
  OR 
  -- Allow admin access by checking if current user has admin role in gw_profiles
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND (admin_check.is_admin = true OR admin_check.is_super_admin = true)
  )
);

-- Update the update policy to allow admins to update any profile
DROP POLICY IF EXISTS "gw_profiles_update_own" ON public.gw_profiles;

CREATE POLICY "gw_profiles_update_access" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated 
USING (
  -- Allow users to update their own profile
  user_id = auth.uid() 
  OR 
  -- Allow admin updates by checking if current user has admin role in gw_profiles
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND (admin_check.is_admin = true OR admin_check.is_super_admin = true)
  )
);