-- COMPLETE RESET: Drop all problematic policies and recreate them properly

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "gw_profiles_admin_manage_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "Secretaries can manage all member profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_alumnae_liaison_view" ON public.gw_profiles;

-- Simple policies that don't cause recursion
-- 1. Users can view their own profile
-- (already exists - gw_profiles_own_select)

-- 2. Executive board members can view all profiles (using simple table check)
CREATE POLICY "gw_profiles_exec_board_view_all_simple"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = auth.uid() 
    AND ebm.is_active = true
  )
);

-- 3. Simple admin check by directly checking the current user's admin status
CREATE POLICY "gw_profiles_admin_manage_simple"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (
  (SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false) 
   FROM public.gw_profiles 
   WHERE user_id = auth.uid() 
   LIMIT 1) = true
);

-- 4. Secretary role (simple table check)
CREATE POLICY "gw_profiles_secretary_manage_simple"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = auth.uid() 
    AND ebm.position = 'secretary'
    AND ebm.is_active = true
  )
);