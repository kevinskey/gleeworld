-- Check what policies exist and drop them all systematically
-- First get a clean slate by dropping ALL policies on gw_profiles

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on gw_profiles table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'gw_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.gw_profiles', pol.policyname);
    END LOOP;
END$$;

-- Now create simple, non-recursive policies

-- Policy for users to view their own profile
CREATE POLICY "gw_profiles_user_self_select"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy for users to update their own profile  
CREATE POLICY "gw_profiles_user_self_update"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for executive board members to access all profiles
-- This uses a simple check that doesn't cause recursion
CREATE POLICY "gw_profiles_exec_board_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);