-- Fix infinite recursion in gw_profiles RLS policies

-- First, create security definer functions to safely check user permissions
CREATE OR REPLACE FUNCTION public.is_current_user_gw_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the problematic policies
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update_access" ON public.gw_profiles;

-- Recreate policies using the security definer function
CREATE POLICY "gw_profiles_admin_access" ON public.gw_profiles
FOR ALL USING (
  (user_id = auth.uid()) OR public.is_current_user_gw_admin()
);

CREATE POLICY "gw_profiles_update_access" ON public.gw_profiles
FOR UPDATE USING (
  (user_id = auth.uid()) OR public.is_current_user_gw_admin()
);