-- Enable RLS policies for gw_assignments table
-- Instructors and admins can view all assignments for courses they teach or manage
CREATE POLICY "Instructors can view assignments"
ON gw_assignments
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM gw_profiles 
    WHERE role IN ('instructor', 'admin', 'super_admin') 
      OR is_admin = true 
      OR is_super_admin = true
  )
);

-- Students can view assignments for courses they're enrolled in
CREATE POLICY "Students can view their course assignments"
ON gw_assignments
FOR SELECT
USING (
  auth.uid() IN (
    SELECT student_id FROM gw_enrollments 
    WHERE course_id = gw_assignments.course_id
  )
);

-- Instructors can insert assignments
CREATE POLICY "Instructors can create assignments"
ON gw_assignments
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM gw_profiles 
    WHERE role IN ('instructor', 'admin', 'super_admin') 
      OR is_admin = true 
      OR is_super_admin = true
  )
);

-- Instructors can update assignments
CREATE POLICY "Instructors can update assignments"
ON gw_assignments
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM gw_profiles 
    WHERE role IN ('instructor', 'admin', 'super_admin') 
      OR is_admin = true 
      OR is_super_admin = true
  )
);

-- Instructors can delete assignments
CREATE POLICY "Instructors can delete assignments"
ON gw_assignments
FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM gw_profiles 
    WHERE role IN ('instructor', 'admin', 'super_admin') 
      OR is_admin = true 
      OR is_super_admin = true
  )
);