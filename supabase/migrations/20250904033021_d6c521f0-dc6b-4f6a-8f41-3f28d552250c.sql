-- Drop all policies on gw_profiles to start fresh
DROP POLICY IF EXISTS "gw_profiles_admin_manage_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_exec_board_view_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_treasurer_view_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_alumnae_liaison_view" ON public.gw_profiles;
DROP POLICY IF EXISTS "Secretaries can manage all member profiles" ON public.gw_profiles;

-- Create simple, non-recursive policies
-- 1. Users can manage their own profile
CREATE POLICY "gw_profiles_own_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Executive board members can view all profiles
CREATE POLICY "gw_profiles_exec_board_view"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 3. Super simple admin check using a security definer function
CREATE OR REPLACE FUNCTION public.check_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- 4. Admins can manage all profiles
CREATE POLICY "gw_profiles_admin_all"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (public.check_user_admin())
WITH CHECK (public.check_user_admin());