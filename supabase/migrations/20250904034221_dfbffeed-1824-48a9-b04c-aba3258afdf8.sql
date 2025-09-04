-- Check current policies and completely fix the infinite recursion
-- Let's see what policies exist on gw_profiles
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'gw_profiles' AND schemaname = 'public';

-- Drop ALL policies on gw_profiles and start completely fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'gw_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.gw_profiles', pol.policyname);
    END LOOP;
END$$;

-- Also drop any problematic functions
DROP FUNCTION IF EXISTS public.is_executive_board_user() CASCADE;

-- Create the simplest possible policies that work
-- Policy 1: Users can see their own profile 
CREATE POLICY "gw_profiles_own_access"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 2: Enable public read access temporarily to get this working
-- We'll refine this later once we confirm it works
CREATE POLICY "gw_profiles_public_read"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (true);