-- Drop the existing student SELECT policy
DROP POLICY "Enrolled students can view published assignments" ON public.gw_course_assignments;

-- Create updated policy that checks BOTH enrollment tables
CREATE POLICY "Enrolled students can view published assignments"
ON public.gw_course_assignments
FOR SELECT
USING (
  is_published = true
  AND (
    -- Check gw_course_enrollments
    EXISTS (
      SELECT 1 FROM gw_course_enrollments
      WHERE gw_course_enrollments.course_id = gw_course_assignments.course_id
        AND gw_course_enrollments.user_id = auth.uid()
    )
    OR
    -- Check legacy mus240_enrollments for MUS 240 course
    EXISTS (
      SELECT 1 FROM mus240_enrollments
      WHERE mus240_enrollments.student_id = auth.uid()
        AND mus240_enrollments.enrollment_status = 'enrolled'
        AND gw_course_assignments.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
    )
    OR
    -- Instructors/TAs can also view
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
        AND (gw_profiles.role = 'instructor' OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
  )
);