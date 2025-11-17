
-- Fix alumnae_users RLS policy for admin access
-- Drop the old incorrect admin policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.alumnae_users;

-- Create correct admin policy for all operations
CREATE POLICY "Admins can manage all alumnae profiles"
ON public.alumnae_users
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);
