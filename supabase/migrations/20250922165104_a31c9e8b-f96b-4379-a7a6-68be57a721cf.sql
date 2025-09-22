-- Fix the is_mus240_student function to properly check MUS 240 enrollment
CREATE OR REPLACE FUNCTION is_mus240_student(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = user_id_param 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = user_id_param 
    AND (
      is_admin = true OR 
      is_super_admin = true
    )
  );
$$;

-- Update RLS policies for mus240_project_groups to ensure enrolled students can see groups
DROP POLICY IF EXISTS "groups_read" ON mus240_project_groups;
CREATE POLICY "groups_read" ON mus240_project_groups
FOR SELECT 
USING (
  -- Allow if user is enrolled in MUS240 for Fall 2025
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  ) 
  OR 
  -- Allow if user is admin
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update RLS policies for mus240_group_memberships to ensure enrolled students can see memberships
DROP POLICY IF EXISTS "memberships_read" ON mus240_group_memberships;
CREATE POLICY "memberships_read" ON mus240_group_memberships
FOR SELECT 
USING (
  -- Allow if user is enrolled in MUS240 for Fall 2025
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  ) 
  OR 
  -- Allow if user is admin
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update RLS policy for memberships insert to use the fixed function
DROP POLICY IF EXISTS "memberships_write" ON mus240_group_memberships;
CREATE POLICY "memberships_write" ON mus240_group_memberships
FOR INSERT 
WITH CHECK (
  -- Allow if user is enrolled in MUS240 for Fall 2025
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  ) 
  OR 
  -- Allow if user is admin
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update RLS policy for groups insert to use the fixed function
DROP POLICY IF EXISTS "groups_write" ON mus240_project_groups;
CREATE POLICY "groups_write" ON mus240_project_groups
FOR INSERT 
WITH CHECK (
  -- Allow if user is enrolled in MUS240 for Fall 2025
  EXISTS (
    SELECT 1 FROM mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
    AND semester = 'Fall 2025'
  ) 
  OR 
  -- Allow if user is admin
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);