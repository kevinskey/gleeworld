-- Drop ALL existing policies on gw_profiles to stop infinite recursion
DROP POLICY IF EXISTS "Executive board members can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Treasurers can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_delete_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_insert_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_select_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update_own" ON public.gw_profiles;

-- Create only safe policies that don't cause recursion
CREATE POLICY "gw_profiles_select_own" 
ON public.gw_profiles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_insert_own" 
ON public.gw_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_update_own" 
ON public.gw_profiles FOR UPDATE 
USING (user_id = auth.uid());

-- Simple admin policy using only auth.uid() and profiles table
CREATE POLICY "gw_profiles_admin_access" 
ON public.gw_profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);