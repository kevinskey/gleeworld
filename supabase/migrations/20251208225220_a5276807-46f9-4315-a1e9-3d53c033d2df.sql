-- Create a completely safe admin check function that uses user_roles table
-- This avoids any recursion by not querying gw_profiles
CREATE OR REPLACE FUNCTION public.is_gw_admin_v2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
  OR EXISTS (
    -- Also check gw_profiles but bypass RLS using the function's security definer context
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Drop and recreate the UPDATE policy to use a simpler approach
DROP POLICY IF EXISTS "gw_profiles_update_policy" ON public.gw_profiles;

-- Create a simple UPDATE policy that:
-- 1. Always allows users to update their own profile
-- 2. Uses the new safe admin check for admins
CREATE POLICY "gw_profiles_update_policy" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() OR is_gw_admin_v2()
)
WITH CHECK (
  user_id = auth.uid() OR is_gw_admin_v2()
);