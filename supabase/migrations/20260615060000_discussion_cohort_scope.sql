-- Phase 18: cohort-scoped discussion threads. Mirrors the announcement
-- pattern from Phase 16: nullable cohort_id, NULL = visible to whole class.
-- Replies inherit visibility from their parent thread (parent_id check).

ALTER TABLE public.gw_course_discussions
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.gw_course_cohorts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_course_discussions_cohort_idx
  ON public.gw_course_discussions(cohort_id) WHERE cohort_id IS NOT NULL;

-- Re-write the SELECT policy: students see a thread (or its replies) iff
-- the thread is either course-wide OR they're in the addressed cohort.
DROP POLICY IF EXISTS "Students see relevant discussions" ON public.gw_course_discussions;
CREATE POLICY "Students see relevant discussions" ON public.gw_course_discussions
  FOR SELECT
  USING (
    -- Instructor / admin always
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_discussions.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)
    )
    -- Top-level thread visibility for enrolled students
    OR (
      parent_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.gw_course_enrollments e
        WHERE e.course_id = gw_course_discussions.course_id
          AND e.user_id = auth.uid()
          AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
      )
      AND (
        cohort_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gw_course_cohort_members m
          WHERE m.cohort_id = gw_course_discussions.cohort_id
            AND m.user_id = auth.uid()
        )
      )
    )
    -- Reply visibility inherits from its parent thread
    OR (
      parent_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.gw_course_discussions parent
        WHERE parent.id = gw_course_discussions.parent_id
          AND (
            parent.cohort_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.gw_course_cohort_members m
              WHERE m.cohort_id = parent.cohort_id
                AND m.user_id = auth.uid()
            )
          )
      )
      AND EXISTS (
        SELECT 1 FROM public.gw_course_enrollments e
        WHERE e.course_id = gw_course_discussions.course_id
          AND e.user_id = auth.uid()
          AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
      )
    )
  );
