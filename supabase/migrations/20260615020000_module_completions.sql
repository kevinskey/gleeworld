-- Phase 13: per-student module completion. Combined with the prereq
-- column added in phase 11, the student-side can now actually gate a
-- module until its prerequisite is completed.

CREATE TABLE IF NOT EXISTS public.gw_course_module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.gw_course_modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid DEFAULT current_tenant_id(),
  UNIQUE (module_id, user_id)
);

CREATE INDEX IF NOT EXISTS gw_course_module_completions_user_idx
  ON public.gw_course_module_completions(user_id, course_id);
CREATE INDEX IF NOT EXISTS gw_course_module_completions_module_idx
  ON public.gw_course_module_completions(module_id);

ALTER TABLE public.gw_course_module_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_module_completions;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_module_completions
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Students manage their own completions
DROP POLICY IF EXISTS "Students manage own completions" ON public.gw_course_module_completions;
CREATE POLICY "Students manage own completions" ON public.gw_course_module_completions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Instructors of the course read all completions in their course
DROP POLICY IF EXISTS "Instructors read course completions" ON public.gw_course_module_completions;
CREATE POLICY "Instructors read course completions" ON public.gw_course_module_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_module_completions.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)
    )
  );
