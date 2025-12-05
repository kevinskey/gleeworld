-- Drop potentially conflicting UPDATE policies on gw_profiles
DROP POLICY IF EXISTS "Allow users to update their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update_own" ON gw_profiles;

-- Create a single clean UPDATE policy for users to update their own profiles
CREATE POLICY "users_can_update_own_profile" ON gw_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also ensure users can view their own profile (consolidate SELECT policies)
DROP POLICY IF EXISTS "Allow users to view their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_select_own" ON gw_profiles;

CREATE POLICY "users_can_view_own_profile" ON gw_profiles
FOR SELECT
USING (auth.uid() = user_id);