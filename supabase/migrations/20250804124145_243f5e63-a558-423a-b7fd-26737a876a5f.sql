-- More targeted fix for infinite recursion issues

-- First, let's disable RLS temporarily to break the recursion cycle
ALTER TABLE gw_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all policies on gw_profiles (even if they might not exist)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "gw_profiles_select_own" ON gw_profiles;
    DROP POLICY IF EXISTS "gw_profiles_insert_own" ON gw_profiles;
    DROP POLICY IF EXISTS "gw_profiles_update_own" ON gw_profiles;
    DROP POLICY IF EXISTS "Users can view their own gw_profile" ON gw_profiles;
    DROP POLICY IF EXISTS "Users can update their own gw_profile" ON gw_profiles;
    DROP POLICY IF EXISTS "Users can insert their own gw_profile" ON gw_profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON gw_profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON gw_profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON gw_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON gw_profiles;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore errors if policies don't exist
END $$;

-- Create gw_radio_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_listeners integer DEFAULT 0,
    total_plays integer DEFAULT 0,
    current_track_id uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on gw_radio_stats and create basic policies
ALTER TABLE gw_radio_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view radio stats" ON gw_radio_stats;
DROP POLICY IF EXISTS "Authenticated users can insert radio stats" ON gw_radio_stats;

CREATE POLICY "radio_stats_select"
ON gw_radio_stats
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "radio_stats_insert"
ON gw_radio_stats
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Re-enable RLS on gw_profiles with completely isolated policies
ALTER TABLE gw_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_select"
ON gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_own_insert"
ON gw_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_own_update"
ON gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());