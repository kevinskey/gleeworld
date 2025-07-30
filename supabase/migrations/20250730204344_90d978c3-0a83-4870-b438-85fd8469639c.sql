-- Remove ALL existing policies on gw_profiles that could cause recursion
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile and exec board basic info" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_insert_own" ON public.gw_profiles;

-- Create simple, non-recursive policies for gw_profiles
-- Allow users to view their own profiles
CREATE POLICY "gw_profiles_select_own" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Allow users to insert their own profiles
CREATE POLICY "gw_profiles_insert_own" 
ON public.gw_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profiles
CREATE POLICY "gw_profiles_update_own" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Allow super admins to do everything (using a direct role check instead of function)
CREATE POLICY "gw_profiles_superadmin_all" 
ON public.gw_profiles 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() 
    AND gp.is_super_admin = true
  )
);