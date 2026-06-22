-- Phase 3: course-template adoption + per-course add-ons.
--
-- adopt_course_template(template_id) — server-side clone of a published
-- template into the caller's tenant. Copies course row + modules +
-- outline_items + assignments + tests. Runtime data (enrollments,
-- attendance, submissions, lounge posts) is NOT cloned — those belong to
-- the live course, not the template.

CREATE OR REPLACE FUNCTION public.adopt_course_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_template gw_courses%ROWTYPE;
  v_new_course_id uuid;
  v_new_course_code text;
  v_attempt int;
  v_module RECORD;
  v_old_to_new_module_id jsonb := '{}'::jsonb;
  v_new_module_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM gw_profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'no_tenant_for_user';
  END IF;

  -- Load template (cross-tenant — templates live at the platform level).
  SELECT * INTO v_template FROM gw_courses
   WHERE id = p_template_id AND is_template = true AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found_or_inactive';
  END IF;

  -- Find an unused course_code in this tenant. If the template's code is
  -- already in use, append " (2)", " (3)", etc.
  v_new_course_code := v_template.course_code;
  v_attempt := 1;
  WHILE EXISTS (
    SELECT 1 FROM gw_courses
     WHERE tenant_id = v_tenant_id AND course_code = v_new_course_code
  ) LOOP
    v_attempt := v_attempt + 1;
    v_new_course_code := v_template.course_code || ' (' || v_attempt || ')';
  END LOOP;

  -- Clone the course row. Calendar/instructor reset to caller; is_template
  -- flipped off; template lineage tracked via description (optional).
  INSERT INTO gw_courses (
    course_code, code, title, description, term, semester,
    instructor_id, instructor_name, instructor_email,
    syllabus_url, default_location, timezone, meeting_patterns,
    is_active, is_free, price_cents, max_enrollment,
    show_assignments, show_discussions, show_journals, show_polls, show_tests, show_grades,
    is_template, created_by, tenant_id
  ) VALUES (
    v_new_course_code, v_new_course_code,
    v_template.title, v_template.description, v_template.term, v_template.semester,
    v_user_id,
    (SELECT full_name FROM gw_profiles WHERE user_id = v_user_id LIMIT 1),
    (SELECT email FROM gw_profiles WHERE user_id = v_user_id LIMIT 1),
    v_template.syllabus_url, v_template.default_location, v_template.timezone, v_template.meeting_patterns,
    true, COALESCE(v_template.is_free, true), v_template.price_cents, v_template.max_enrollment,
    v_template.show_assignments, v_template.show_discussions, v_template.show_journals,
    v_template.show_polls, v_template.show_tests, v_template.show_grades,
    false, v_user_id, v_tenant_id
  )
  RETURNING id INTO v_new_course_id;

  -- Modules: clone, remembering each old_id -> new_id so outline_items can
  -- be remapped below.
  FOR v_module IN
    SELECT * FROM gw_course_modules WHERE course_id = p_template_id
  LOOP
    INSERT INTO gw_course_modules (
      course_id, title, description, position, is_published, tenant_id, created_by
    ) VALUES (
      v_new_course_id, v_module.title, v_module.description, v_module.position,
      COALESCE(v_module.is_published, true), v_tenant_id, v_user_id
    )
    RETURNING id INTO v_new_module_id;
    v_old_to_new_module_id := jsonb_set(v_old_to_new_module_id,
      ARRAY[v_module.id::text], to_jsonb(v_new_module_id::text));
  END LOOP;

  -- Outline items: clone with remapped module_id.
  INSERT INTO gw_course_outline_items (
    course_id, module_id, title, description, item_type, content, position,
    tenant_id, created_by
  )
  SELECT
    v_new_course_id,
    (v_old_to_new_module_id->>oi.module_id::text)::uuid,
    oi.title, oi.description, oi.item_type, oi.content, oi.position,
    v_tenant_id, v_user_id
  FROM gw_course_outline_items oi
  WHERE oi.course_id = p_template_id
    AND oi.module_id IS NOT NULL
    AND v_old_to_new_module_id ? oi.module_id::text;

  -- Assignments: clone (instructor + dates left for the teacher to set).
  INSERT INTO gw_assignments (
    course_id, title, description, assignment_type, category, points,
    due_at, is_active, tenant_id, created_by
  )
  SELECT
    v_new_course_id, title, description, assignment_type, category, points,
    NULL,                                   -- caller sets dates per their semester
    COALESCE(is_active, true), v_tenant_id, v_user_id
  FROM gw_assignments
  WHERE course_id = p_template_id;

  -- Tests: clone (availability window left blank, instructor publishes).
  INSERT INTO gw_course_tests (
    course_id, title, duration_minutes, max_attempts, allow_retakes,
    show_results_immediately, randomize_questions, total_points,
    is_published, tenant_id, created_by
  )
  SELECT
    v_new_course_id, title, duration_minutes, max_attempts, allow_retakes,
    show_results_immediately, randomize_questions, total_points,
    false,                                  -- caller publishes when ready
    v_tenant_id, v_user_id
  FROM gw_course_tests
  WHERE course_id = p_template_id;

  RETURN v_new_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adopt_course_template(uuid) TO authenticated;


-- ── Per-course add-ons (Tour, QR, YouTube, Polls, etc.) ───────────────────
--
-- A junction row per (course, addon). Defaults disabled; teacher flips
-- on per-class. RLS: tenant isolation + readable by enrolled students +
-- writable by the course instructor or tenant admin.

CREATE TABLE IF NOT EXISTS public.gw_course_addons (
  course_id   uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  addon_slug  text NOT NULL,
  is_enabled  boolean NOT NULL DEFAULT true,
  config      jsonb,
  enabled_at  timestamptz NOT NULL DEFAULT now(),
  enabled_by  uuid,
  tenant_id   uuid NOT NULL DEFAULT current_tenant_id(),
  PRIMARY KEY (course_id, addon_slug)
);

CREATE INDEX IF NOT EXISTS gw_course_addons_course_idx
  ON public.gw_course_addons(course_id);

ALTER TABLE public.gw_course_addons ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (RESTRICTIVE so it stacks with permissive policies)
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_addons;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_addons
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Instructor of the course (or tenant admin) can manage add-ons
DROP POLICY IF EXISTS "Instructor manages course add-ons" ON public.gw_course_addons;
CREATE POLICY "Instructor manages course add-ons" ON public.gw_course_addons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_addons.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_addons.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin)
    )
  );

-- Enrolled students can see which add-ons are active on their course
DROP POLICY IF EXISTS "Enrolled students see course add-ons" ON public.gw_course_addons;
CREATE POLICY "Enrolled students see course add-ons" ON public.gw_course_addons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_addons.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled', 'active', 'in_progress', 'registered')
    )
  );
