-- Fix infinite recursion in gw_profiles policies by removing the problematic policies and creating simpler ones

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON gw_profiles;

-- Create new, simple policies without recursion
CREATE POLICY "Enable read for users based on user_id" ON gw_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON gw_profiles  
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users only" ON gw_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);