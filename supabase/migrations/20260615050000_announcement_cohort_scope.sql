-- Phase 16: cohort-scoped announcements. nullable cohort_id; NULL = post
-- visible to everyone in the course. Set to a cohort id to scope visibility
-- to that section's members only.

ALTER TABLE public.gw_course_announcements
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.gw_course_cohorts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_course_announcements_cohort_idx
  ON public.gw_course_announcements(cohort_id) WHERE cohort_id IS NOT NULL;

-- Tighten SELECT so students only see announcements addressed to them
-- (all-class OR a cohort they belong to). Instructors see everything.

DROP POLICY IF EXISTS "Students see relevant announcements" ON public.gw_course_announcements;
CREATE POLICY "Students see relevant announcements" ON public.gw_course_announcements
  FOR SELECT
  USING (
    -- Instructor of course OR tenant admin always sees
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_announcements.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)
    )
    -- Enrolled student: course-wide announcement, or one for a cohort
    -- they're a member of.
    OR (
      EXISTS (
        SELECT 1 FROM public.gw_course_enrollments e
        WHERE e.course_id = gw_course_announcements.course_id
          AND e.user_id = auth.uid()
          AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
      )
      AND (
        cohort_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gw_course_cohort_members m
          WHERE m.cohort_id = gw_course_announcements.cohort_id
            AND m.user_id = auth.uid()
        )
      )
    )
  );
