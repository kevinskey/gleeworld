-- Students silently saw zero assignments in every course.
--
-- Root cause: the SELECT policy on gw_assignments joined the LEGACY
-- gw_enrollments table (student_id column) which no code path
-- populates any more. Every enrollment now lands in
-- gw_course_enrollments (user_id column). The stale join matched no
-- rows, so students got an empty list regardless of publish state.
--
-- Fix: rewrite the policy to check the modern enrollment table AND
-- gate on is_active=true so drafts stay hidden from students. New
-- assignments default to is_active=true (see CourseShell.tsx submit),
-- so teachers no longer have to remember a Publish toggle.

DROP POLICY IF EXISTS "Students can view their course assignments"
  ON public.gw_assignments;

CREATE POLICY "Students can view their course assignments"
  ON public.gw_assignments
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND auth.uid() IN (
      SELECT user_id FROM public.gw_course_enrollments
      WHERE course_id = gw_assignments.course_id
        AND enrollment_status IN ('enrolled', 'active', 'in_progress', 'registered')
    )
  );
