-- Phase 15: per-course cohorts (sub-groupings inside a course).
-- A student can belong to multiple cohorts (e.g. "Soprano 1" + "Tour Travelers").
-- Cohorts are course-scoped, not workspace-scoped.

CREATE TABLE IF NOT EXISTS public.gw_course_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#0ea5e9',
  position int NOT NULL DEFAULT 0,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, name)
);
CREATE INDEX IF NOT EXISTS gw_course_cohorts_course_idx ON public.gw_course_cohorts(course_id, position);

CREATE TABLE IF NOT EXISTS public.gw_course_cohort_members (
  cohort_id uuid NOT NULL REFERENCES public.gw_course_cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid DEFAULT current_tenant_id(),
  PRIMARY KEY (cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS gw_course_cohort_members_user_idx ON public.gw_course_cohort_members(user_id);

-- ── RLS ──

ALTER TABLE public.gw_course_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_cohort_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_cohorts;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_cohorts
  AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_cohort_members;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_cohort_members
  AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Cohorts: instructor manages, enrolled students read
DROP POLICY IF EXISTS "Instructor manages cohorts" ON public.gw_course_cohorts;
CREATE POLICY "Instructor manages cohorts" ON public.gw_course_cohorts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_cohorts.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_cohorts.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students read cohorts" ON public.gw_course_cohorts;
CREATE POLICY "Enrolled students read cohorts" ON public.gw_course_cohorts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_cohorts.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );

-- Memberships: instructor manages, students see their own + their course's cohorts
DROP POLICY IF EXISTS "Instructor manages cohort memberships" ON public.gw_course_cohort_members;
CREATE POLICY "Instructor manages cohort memberships" ON public.gw_course_cohort_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_cohorts ch
      JOIN public.gw_courses c ON c.id = ch.course_id
      WHERE ch.id = gw_course_cohort_members.cohort_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_course_cohorts ch
      JOIN public.gw_courses c ON c.id = ch.course_id
      WHERE ch.id = gw_course_cohort_members.cohort_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Students see own course cohort memberships" ON public.gw_course_cohort_members;
CREATE POLICY "Students see own course cohort memberships" ON public.gw_course_cohort_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.gw_course_cohorts ch
      JOIN public.gw_course_enrollments e ON e.course_id = ch.course_id
      WHERE ch.id = gw_course_cohort_members.cohort_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );
