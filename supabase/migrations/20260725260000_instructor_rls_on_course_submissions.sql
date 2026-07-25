-- Instructors need to see and grade submissions in their own courses.
--
-- gw_course_submissions previously had SELECT/UPDATE policies for:
--   • students, scoped to their own row
--   • admins / super_admins (via gw_profiles flags), everything
--
-- Regular course instructors — the vast majority of the grading UI's
-- users — fell through both. The InstructorSubmissionsDialog therefore
-- showed 0 rows even for populated courses, and grades wouldn't save.
--
-- This adds a third path: an instructor of the course (either via
-- gw_courses.instructor_id or a gw_course_enrollments row with role
-- instructor/admin) can SELECT/UPDATE/INSERT/DELETE submissions where
-- assignment_id belongs to their course.

DROP POLICY IF EXISTS "Instructors can manage course submissions"
  ON public.gw_course_submissions;

CREATE POLICY "Instructors can manage course submissions"
  ON public.gw_course_submissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.gw_assignments a
        JOIN public.gw_courses c ON c.id = a.course_id
       WHERE a.id = gw_course_submissions.assignment_id
         AND (
           c.instructor_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.gw_course_enrollments e
             WHERE e.course_id = c.id
               AND e.user_id = auth.uid()
               AND e.role IN ('instructor', 'admin')
           )
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.gw_assignments a
        JOIN public.gw_courses c ON c.id = a.course_id
       WHERE a.id = gw_course_submissions.assignment_id
         AND (
           c.instructor_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.gw_course_enrollments e
             WHERE e.course_id = c.id
               AND e.user_id = auth.uid()
               AND e.role IN ('instructor', 'admin')
           )
         )
    )
  );
