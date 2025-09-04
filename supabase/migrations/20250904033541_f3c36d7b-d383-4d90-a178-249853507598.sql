-- Fix infinite recursion by completely replacing all policies
-- Drop all policies first, then functions, then recreate

-- Drop all existing policies on gw_profiles
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_self_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_self_view" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_self_update" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_exec_all_access" ON public.gw_profiles;

-- Drop the function causing recursion
DROP FUNCTION IF EXISTS public.current_user_can_access_admin_modules();

-- Create a simple function that only checks executive board membership
CREATE OR REPLACE FUNCTION public.is_executive_board_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Create non-recursive policies for gw_profiles
-- Policy 1: Users can view their own profile
CREATE POLICY "users_view_own_profile"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Executive board members can view all profiles
CREATE POLICY "executives_view_all_profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (public.is_executive_board_user() = true);

-- Policy 4: Executive board members can insert profiles
CREATE POLICY "executives_insert_profiles"
ON public.gw_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_executive_board_user() = true);

-- Policy 5: Executive board members can update all profiles
CREATE POLICY "executives_update_all_profiles"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (public.is_executive_board_user() = true)
WITH CHECK (public.is_executive_board_user() = true);