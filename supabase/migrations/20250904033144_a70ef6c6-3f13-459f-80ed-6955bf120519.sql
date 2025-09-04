-- Temporarily disable the problematic admin policy
DROP POLICY IF EXISTS "gw_profiles_admin_manage_simple" ON public.gw_profiles;

-- Test if the issue is resolved now
-- Keep only the simple policies that work