-- Fix member_exit_interviews RLS to prevent infinite recursion
-- The admin policy was directly querying gw_profiles, causing RLS recursion

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all exit interviews" ON member_exit_interviews;

-- Recreate using the SECURITY DEFINER function that bypasses RLS
CREATE POLICY "Admins can view all exit interviews" 
ON member_exit_interviews 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_gw_admin_v2()
);

-- Also ensure users can view their own interviews (already exists but let's be safe)
-- This policy is fine as-is since it uses auth.uid() directly