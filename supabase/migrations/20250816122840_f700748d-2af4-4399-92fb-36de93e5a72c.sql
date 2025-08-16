-- Fix infinite recursion by dropping all gw_profiles policies and recreating them safely
DROP POLICY IF EXISTS "Admin and alumnae liaison profile access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Alumnae liaison can view alumnae profiles" ON public.gw_profiles;

-- Create safe, non-recursive policies
CREATE POLICY "gw_profiles_own_select" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_own_update" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_own_insert" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Simple admin policy that checks auth.users directly to avoid recursion
CREATE POLICY "gw_profiles_admin_access" 
ON public.gw_profiles 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.gw_profiles 
    WHERE (is_admin = true OR is_super_admin = true)
  )
);