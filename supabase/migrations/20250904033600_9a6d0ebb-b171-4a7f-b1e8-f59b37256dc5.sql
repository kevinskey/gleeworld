-- Fix infinite recursion in gw_profiles policies
-- First, let's see what policies currently exist and drop problematic ones

-- Drop all existing policies on gw_profiles to start fresh
DROP POLICY IF EXISTS "gw_profiles_admin_manage_final" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_exec_view_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_secretary_manage" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_treasurer_manage" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_dues_manager_view" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_self_view" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;

-- Create simple, non-recursive functions to check roles
CREATE OR REPLACE FUNCTION public.current_user_can_access_admin_modules()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM gw_executive_board_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ),
    false
  );
$$;

-- Simple self-access policy for viewing own profile
CREATE POLICY "gw_profiles_self_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin and executive board access policy
CREATE POLICY "gw_profiles_admin_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (public.current_user_can_access_admin_modules() = true)
WITH CHECK (public.current_user_can_access_admin_modules() = true);