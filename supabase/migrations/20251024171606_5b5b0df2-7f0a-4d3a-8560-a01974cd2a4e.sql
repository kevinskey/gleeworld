-- Fix RLS policies for group_updates_mus240 to allow viewing presentations
-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow viewing group updates" ON group_updates_mus240;

-- Drop other existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all updates" ON group_updates_mus240;
DROP POLICY IF EXISTS "MUS240 students can view all updates" ON group_updates_mus240;

-- Create new SELECT policy that allows anyone to view for presentation purposes
CREATE POLICY "Allow public viewing of group updates"
ON group_updates_mus240
FOR SELECT
USING (true);