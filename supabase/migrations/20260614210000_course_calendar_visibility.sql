-- Course calendars + events visibility: only the instructor and enrolled
-- students can see a course's auto-synced calendar entries (assignments,
-- tests, and any other course-scoped events). Tenant isolation still
-- applies on top via the existing RESTRICTIVE policy.

-- ── gw_events: instructor + enrolled-student SELECT ────────────────────

DROP POLICY IF EXISTS "instructors_see_course_events" ON public.gw_events;
CREATE POLICY "instructors_see_course_events"
ON public.gw_events
FOR SELECT
USING (
  course_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.id = gw_events.course_id
      AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "enrolled_students_see_course_events" ON public.gw_events;
CREATE POLICY "enrolled_students_see_course_events"
ON public.gw_events
FOR SELECT
USING (
  course_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e
    WHERE e.course_id = gw_events.course_id
      AND e.user_id = auth.uid()
      AND e.enrollment_status IN ('enrolled', 'active', 'in_progress', 'registered')
  )
);

-- ── gw_calendars: restrict course-bound calendars ──────────────────────
-- The old "Everyone can view calendars" policy let any tenant member see
-- the name + color of every course calendar. Replace it with a policy that
-- hides course-bound calendars from people who aren't the instructor or
-- enrolled.

DROP POLICY IF EXISTS "Everyone can view calendars" ON public.gw_calendars;

DROP POLICY IF EXISTS "view_calendars_with_course_scope" ON public.gw_calendars;
CREATE POLICY "view_calendars_with_course_scope"
ON public.gw_calendars
FOR SELECT
USING (
  -- General (non-course) calendars stay visible to all tenant members.
  NOT EXISTS (SELECT 1 FROM public.gw_courses c WHERE c.calendar_id = gw_calendars.id)
  -- You can always see calendars you created.
  OR created_by = auth.uid()
  -- Instructor for the course this calendar belongs to.
  OR EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.calendar_id = gw_calendars.id
      AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
  -- Enrolled student for the course this calendar belongs to.
  OR EXISTS (
    SELECT 1 FROM public.gw_courses c
    JOIN public.gw_course_enrollments e ON e.course_id = c.id
    WHERE c.calendar_id = gw_calendars.id
      AND e.user_id = auth.uid()
      AND e.enrollment_status IN ('enrolled', 'active', 'in_progress', 'registered')
  )
);
