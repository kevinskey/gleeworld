-- Comprehensive fix for infinite recursion in gw_profiles and related issues

-- Step 1: Disable RLS temporarily on gw_profiles to fix the immediate issue
ALTER TABLE gw_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on gw_profiles to start fresh
DROP POLICY IF EXISTS "Users can view their own gw_profile" ON gw_profiles;
DROP POLICY IF EXISTS "Users can update their own gw_profile" ON gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own gw_profile" ON gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON gw_profiles;

-- Step 3: Create the gw_radio_stats table if it doesn't exist (fixing the 400 error)
CREATE TABLE IF NOT EXISTS public.gw_radio_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_listeners integer DEFAULT 0,
    total_plays integer DEFAULT 0,
    current_track_id uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on gw_radio_stats
ALTER TABLE gw_radio_stats ENABLE ROW LEVEL SECURITY;

-- Create simple policy for gw_radio_stats
CREATE POLICY "Anyone can view radio stats"
ON gw_radio_stats
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert radio stats"
ON gw_radio_stats
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 4: Re-enable RLS on gw_profiles with new simple policies
ALTER TABLE gw_profiles ENABLE ROW LEVEL SECURITY;

-- Create completely independent policies that don't reference other tables
CREATE POLICY "gw_profiles_select_own"
ON gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_insert_own"
ON gw_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_update_own"
ON gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Fix any remaining storage policies to be even simpler
DROP POLICY IF EXISTS "Allow authenticated uploads to user-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to user-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated selects from user-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from user-files" ON storage.objects;

-- Create the simplest possible storage policies
CREATE POLICY "storage_insert_user_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-files');

CREATE POLICY "storage_select_user_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-files');

CREATE POLICY "storage_update_user_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-files');

CREATE POLICY "storage_delete_user_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'user-files');