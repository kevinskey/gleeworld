-- Assistant Course Builder: draft status on gw_courses + one-shot draft-course RPC.
-- Spec: docs/superpowers/specs/2026-07-13-assistant-course-builder-design.md

-- 1) Draft status + pending roster ------------------------------------------
ALTER TABLE public.gw_courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS pending_enrollments jsonb;

ALTER TABLE public.gw_courses DROP CONSTRAINT IF EXISTS gw_courses_status_check;
ALTER TABLE public.gw_courses
  ADD CONSTRAINT gw_courses_status_check CHECK (status IN ('draft','published'));

-- 2) Hide drafts from everyone except admins and the course owner -----------
-- (Admins keep access through the separate permissive "Admins can manage courses"
-- policy; the tenant RESTRICTIVE policies are untouched.)
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.gw_courses;
CREATE POLICY "Anyone can view active courses" ON public.gw_courses
  FOR SELECT USING (
    (is_active = true OR is_active IS NULL)
    AND (status = 'published' OR created_by = auth.uid() OR instructor_id = auth.uid())
  );

-- 3) Normalize course-satellite write policies -------------------------------
-- assistant_create_course is SECURITY INVOKER: the whole transaction fails if
-- ANY satellite insert is blocked by RLS. The legacy policies disagree on role
-- spellings ('super-admin' vs 'super_admin') and on flag-vs-role checks, so an
-- is_admin-flagged caller could pass gw_assignments but fail gw_course_modules.
-- One shared predicate, both spellings accepted (canonical repo rule).
CREATE OR REPLACE FUNCTION public.is_course_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true
           OR role IN ('admin','super_admin','super-admin','instructor'))
  );
$$;
REVOKE ALL ON FUNCTION public.is_course_editor() FROM public;
GRANT EXECUTE ON FUNCTION public.is_course_editor() TO authenticated;

DROP POLICY IF EXISTS "Instructors can manage modules" ON public.gw_course_modules;
CREATE POLICY "Instructors can manage modules" ON public.gw_course_modules
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins can manage rubrics" ON public.gw_course_rubrics;
CREATE POLICY "Admins can manage rubrics" ON public.gw_course_rubrics
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins can manage rubric criteria" ON public.gw_rubric_criteria;
CREATE POLICY "Admins can manage rubric criteria" ON public.gw_rubric_criteria
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins manage playlists" ON public.gw_course_playlists;
CREATE POLICY "Admins manage playlists" ON public.gw_course_playlists
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

-- gw_assignments write policies already cover instructor/admin/super_admin by
-- role; add the editor predicate as an additional permissive INSERT policy so
-- is_admin-flagged users without those role strings can also insert.
DROP POLICY IF EXISTS "Course editors can insert assignments" ON public.gw_assignments;
CREATE POLICY "Course editors can insert assignments" ON public.gw_assignments
  FOR INSERT WITH CHECK (public.is_course_editor());

-- 4) Deterministic session expansion (testable in isolation) -----------------
CREATE OR REPLACE FUNCTION public.expand_class_sessions(
  p_patterns jsonb, p_start date, p_end date, p_breaks jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE (session_date date, start_time time, end_time time, location text)
LANGUAGE sql IMMUTABLE AS $$
  SELECT d::date,
         (p->>'start_time')::time,
         (p->>'end_time')::time,
         p->>'location'
  FROM generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') AS d
  JOIN jsonb_array_elements(coalesce(p_patterns, '[]'::jsonb)) AS p
    ON (p->>'weekday')::int = extract(dow FROM d)::int
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(p_breaks, '[]'::jsonb)) b
    WHERE d::date BETWEEN (b->>'from')::date AND (b->>'to')::date
  )
  ORDER BY 1, 2;
$$;
GRANT EXECUTE ON FUNCTION public.expand_class_sessions(jsonb, date, date, jsonb) TO authenticated;

-- 5) One-shot draft-course RPC (SECURITY INVOKER — RLS applies) ---------------
CREATE OR REPLACE FUNCTION public.assistant_create_course(spec jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_title text := trim(coalesce(spec->>'title', ''));
  v_start date;
  v_end date;
  v_code_base text;
  v_code text;
  v_instructor_name text;
  v_rubric_id uuid;
  v_module_count int := 0;
  v_assignment_count int := 0;
  v_session_count int := 0;
  v_repertoire text;
  m record;
  a record;
  c record;
  i int := 1;
BEGIN
  -- Structural re-checks (the edge fn validated; never trust a single layer).
  IF v_title = '' THEN RAISE EXCEPTION 'spec.title is required'; END IF;
  v_start := (spec->>'start_date')::date;
  v_end := (spec->>'end_date')::date;
  IF v_end <= v_start THEN RAISE EXCEPTION 'end_date must be after start_date'; END IF;
  IF jsonb_typeof(spec->'modules') <> 'array' OR jsonb_array_length(spec->'modules') < 1 THEN
    RAISE EXCEPTION 'at least one module is required';
  END IF;
  IF jsonb_array_length(spec->'modules') > 16 THEN RAISE EXCEPTION 'too many modules (max 16)'; END IF;

  v_code_base := upper(coalesce(nullif(trim(spec->>'course_code'), ''),
                                'GW-' || substr(md5(v_title || clock_timestamp()::text), 1, 6)));
  v_code := v_code_base;
  WHILE EXISTS (SELECT 1 FROM gw_courses
                WHERE tenant_id = current_tenant_id() AND course_code = v_code) LOOP
    IF i > 9 THEN RAISE EXCEPTION 'could not find a free course code near %', v_code_base; END IF;
    v_code := v_code_base || '-' || i;
    i := i + 1;
  END LOOP;

  SELECT full_name INTO v_instructor_name FROM gw_profiles WHERE user_id = auth.uid();

  INSERT INTO gw_courses
    (course_code, code, title, description, semester, instructor_id, instructor_name,
     is_active, is_template, is_free, status, pending_enrollments, created_by, tenant_id)
  VALUES
    (v_code, v_code, v_title, spec->>'description', coalesce(spec->>'semester', ''),
     auth.uid(), v_instructor_name,
     true, false, true, 'draft',
     CASE WHEN jsonb_typeof(spec->'roster') = 'array' AND jsonb_array_length(spec->'roster') > 0
          THEN spec->'roster' ELSE NULL END,
     auth.uid(), current_tenant_id())
  RETURNING id INTO v_course_id;

  FOR m IN
    SELECT value AS mod, ordinality AS ord
    FROM jsonb_array_elements(spec->'modules') WITH ORDINALITY
  LOOP
    INSERT INTO gw_course_modules
      (course_id, module_id, title, description, week_number, is_active, is_locked,
       display_order, learning_objectives)
    VALUES
      (v_course_id, 'mod-' || m.ord, m.mod->>'title', m.mod->>'description',
       coalesce((m.mod->>'week_number')::int, m.ord::int), true, false,
       m.ord::int, coalesce(m.mod->'learning_objectives', '[]'::jsonb));
    v_module_count := v_module_count + 1;

    FOR a IN
      SELECT value AS asg FROM jsonb_array_elements(coalesce(m.mod->'assignments', '[]'::jsonb))
    LOOP
      IF trim(coalesce(a.asg->>'title','')) = '' THEN RAISE EXCEPTION 'assignment title missing in module %', m.ord; END IF;
      INSERT INTO gw_assignments
        (course_id, title, description, instructions, assignment_type, category,
         points, due_at, is_active, created_by, tenant_id)
      VALUES
        (v_course_id, a.asg->>'title', a.asg->>'description', a.asg->>'instructions',
         coalesce(nullif(a.asg->>'assignment_type',''), 'standard'),
         coalesce(nullif(a.asg->>'category',''), 'general'),
         coalesce((a.asg->>'points')::int, 100), (a.asg->>'due_at')::timestamptz,
         true, auth.uid(), current_tenant_id());
      v_assignment_count := v_assignment_count + 1;
    END LOOP;
  END LOOP;

  IF jsonb_typeof(spec->'rubric') = 'object' THEN
    INSERT INTO gw_course_rubrics (course_id, title, description, is_default, created_by)
    VALUES (v_course_id, spec->'rubric'->>'title', spec->'rubric'->>'description', true, auth.uid())
    RETURNING id INTO v_rubric_id;
    FOR c IN
      SELECT value AS cri, ordinality AS ord
      FROM jsonb_array_elements(coalesce(spec->'rubric'->'criteria', '[]'::jsonb)) WITH ORDINALITY
    LOOP
      INSERT INTO gw_rubric_criteria
        (rubric_id, criterion_name, description, max_points, weight_percentage, display_order)
      VALUES
        (v_rubric_id, c.cri->>'name', c.cri->>'description',
         coalesce((c.cri->>'max_points')::int, 10),
         coalesce((c.cri->>'weight_percentage')::numeric, 0), c.ord::int);
    END LOOP;
  END IF;

  INSERT INTO gw_course_class_sessions
    (course_id, title, session_date, start_time, end_time, location, session_type,
     attendance_required, created_by)
  SELECT v_course_id, v_title || ' — Class', s.session_date, s.start_time, s.end_time,
         s.location, 'class', true, auth.uid()
  FROM public.expand_class_sessions(
    spec->'meeting_patterns', v_start, v_end, coalesce(spec->'breaks', '[]'::jsonb)) s;
  GET DIAGNOSTICS v_session_count = ROW_COUNT;
  IF v_session_count > 120 THEN RAISE EXCEPTION 'expanded to % sessions (max 120)', v_session_count; END IF;

  IF jsonb_typeof(spec->'repertoire') = 'array' AND jsonb_array_length(spec->'repertoire') > 0 THEN
    SELECT string_agg(
             CASE WHEN r->>'library_item_id' IS NOT NULL
                  THEN '• ' || (r->>'title') || ' [library:' || (r->>'library_item_id') || ']'
                  ELSE '• ' || (r->>'title') END, E'\n')
      INTO v_repertoire
      FROM jsonb_array_elements(spec->'repertoire') r;
    INSERT INTO gw_course_playlists
      (course_id, title, description, is_public, is_featured, display_order, created_by)
    VALUES
      (v_course_id, 'Repertoire',
       'Draft repertoire from the Assistant interview:' || E'\n' || v_repertoire,
       false, false, 0, auth.uid());
  END IF;

  RETURN jsonb_build_object(
    'course_id', v_course_id,
    'course_code', v_code,
    'title', v_title,
    'module_count', v_module_count,
    'assignment_count', v_assignment_count,
    'session_count', v_session_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.assistant_create_course(jsonb) TO authenticated;
