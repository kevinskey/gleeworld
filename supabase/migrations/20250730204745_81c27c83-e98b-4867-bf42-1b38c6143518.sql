-- Check current policies on gw_profiles table
\d+ gw_profiles;

-- Drop ALL existing policies on gw_profiles to eliminate recursion
DROP POLICY IF EXISTS "gw_profiles_select_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_insert_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update_own" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_read_for_exec_board" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_superadmin_all" ON public.gw_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gw_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gw_profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.gw_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "gw_profiles_basic_access" 
ON public.gw_profiles 
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);