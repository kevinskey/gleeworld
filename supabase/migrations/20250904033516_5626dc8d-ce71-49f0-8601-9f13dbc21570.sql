-- Fix the infinite recursion issue by using a completely different approach
-- Drop the problematic function and create a simpler one

DROP FUNCTION IF EXISTS public.current_user_can_access_admin_modules();

-- Create a function that doesn't reference gw_profiles for admin checks
CREATE OR REPLACE FUNCTION public.is_executive_or_admin()
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

-- Drop existing policies
DROP POLICY IF EXISTS "gw_profiles_self_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;

-- Create simple policies that don't cause recursion
CREATE POLICY "gw_profiles_self_view"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_self_update"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_exec_all_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (public.is_executive_or_admin() = true)
WITH CHECK (public.is_executive_or_admin() = true);