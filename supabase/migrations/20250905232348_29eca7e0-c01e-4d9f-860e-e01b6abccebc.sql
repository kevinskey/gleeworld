-- Check current RLS policies and ensure proper UPDATE access for gw_profiles
-- Add missing UPDATE policy if needed

-- First, check if we need to add an explicit UPDATE policy
DROP POLICY IF EXISTS "gw_profiles_own_update" ON public.gw_profiles;

-- Create explicit UPDATE policy for users to update their own profiles
CREATE POLICY "gw_profiles_own_update" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure admin UPDATE access
DROP POLICY IF EXISTS "gw_profiles_admin_update" ON public.gw_profiles;

CREATE POLICY "gw_profiles_admin_update" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);