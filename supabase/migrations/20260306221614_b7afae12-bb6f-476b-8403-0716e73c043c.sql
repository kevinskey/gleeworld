-- Allow instructors and exec board members to view all enrollments for courses
-- This fixes the roster not showing all students for non-admin instructors
CREATE POLICY "Instructors and exec board can view enrollments"
  ON public.gw_course_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (
        gw_profiles.is_admin = true
        OR gw_profiles.is_super_admin = true
        OR gw_profiles.is_exec_board = true
        OR gw_profiles.role = 'instructor'
        OR gw_profiles.role = 'admin'
      )
    )
  );