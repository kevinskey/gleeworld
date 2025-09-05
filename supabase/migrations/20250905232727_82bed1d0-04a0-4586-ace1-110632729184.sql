-- Clean up and fix gw_profiles UPDATE policies
-- Remove overlapping policies that might be causing conflicts

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "gw_profiles_own_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_own_update" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_admin_update" ON public.gw_profiles;

-- Create clean, specific policies for gw_profiles
-- Allow users to SELECT their own profile
CREATE POLICY "gw_profiles_select_own" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow users to UPDATE their own profile
CREATE POLICY "gw_profiles_update_own" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to INSERT their own profile
CREATE POLICY "gw_profiles_insert_own" 
ON public.gw_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all profiles
CREATE POLICY "gw_profiles_admin_all" 
ON public.gw_profiles 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);

-- Keep the public read policy for general access
-- This should already exist as "gw_profiles_public_read"