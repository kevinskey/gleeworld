-- Fix RLS policies for group_updates_mus240 to allow viewing presentations
-- and handle both 'super_admin' and 'super-admin' role formats

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all updates" ON group_updates_mus240;
DROP POLICY IF EXISTS "MUS240 students can view all updates" ON group_updates_mus240;

-- Create new SELECT policy that allows:
-- 1. Admins (with flexible role matching)
-- 2. MUS240 enrolled students
-- 3. Anyone to view (for presentation mode)
CREATE POLICY "Allow viewing group updates"
ON group_updates_mus240
FOR SELECT
USING (
  -- Allow admins and super admins (handle both formats)
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role IN ('admin', 'super_admin', 'super-admin')
      OR gw_profiles.is_admin = true
      OR gw_profiles.is_super_admin = true
    )
  )
  OR
  -- Allow enrolled MUS240 students
  EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE mus240_enrollments.student_id = auth.uid()
    AND mus240_enrollments.semester = 'Fall 2025'
    AND mus240_enrollments.enrollment_status = 'enrolled'
  )
  OR
  -- Allow anyone to view for presentation purposes
  true
);