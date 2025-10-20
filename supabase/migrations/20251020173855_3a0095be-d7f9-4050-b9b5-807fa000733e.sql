-- Fix RLS policies for mus240_enrollments to allow admin inserts
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON mus240_enrollments;
DROP POLICY IF EXISTS "Instructors can manage enrollments" ON mus240_enrollments;

-- Create proper policies with both qual and with_check for INSERT operations
CREATE POLICY "Admins can manage all enrollments"
ON mus240_enrollments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);