-- Extend assistant_create_course to also create quizzes (unpublished).
-- Spec: docs/superpowers/specs/2026-07-13-assistant-course-builder-design.md

-- 1) Course editors (incl. instructors) can create tests via the RPC (existing
-- "Admins can manage tests" is is_admin-flag-only; is_course_editor() is deployed).
-- gw_course_tests is a real prod table from 20260615000000_quiz_questions.sql and
-- predates this migrations-tests/ scratch harness, which builds it only as a
-- stand-in inside its own test file (after this migration runs). Guard the DDL
-- so it's a no-op there and takes effect wherever the table actually exists
-- (prod) instead of erroring on an undefined relation.
DO $$
BEGIN
  IF to_regclass('public.gw_course_tests') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Course editors can manage tests" ON public.gw_course_tests';
    EXECUTE 'CREATE POLICY "Course editors can manage tests" ON public.gw_course_tests '
      || 'FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor())';
  END IF;
END $$;

-- 2) assistant_create_course now also inserts quizzes + questions (unpublished).
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
  v_quiz_count int := 0;
  m record;
  a record;
  c record;
  q record;
  x record;
  i int := 1;
  v_test_id uuid;
  v_opts jsonb;
  v_correct jsonb;
BEGIN
  -- Structural re-checks (the edge fn validated; never trust a single layer).
  IF v_title = '' THEN RAISE EXCEPTION 'spec.title is required'; END IF;
  v_start := (spec->>'start_date')::date;
  v_end := (spec->>'end_date')::date;
  -- NULL-safe: an absent key yields NULL and `v_end <= v_start` would be
  -- silently false, letting a spec with no dates through.
  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
    RAISE EXCEPTION 'start_date/end_date invalid';
  END IF;
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
    IF trim(coalesce(m.mod->>'title','')) = '' THEN RAISE EXCEPTION 'module title missing at position %', m.ord; END IF;
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

  IF jsonb_typeof(spec->'quizzes') = 'array' THEN
    FOR q IN SELECT value AS quiz FROM jsonb_array_elements(spec->'quizzes')
    LOOP
      IF trim(coalesce(q.quiz->>'title','')) = '' THEN RAISE EXCEPTION 'quiz title missing'; END IF;
      INSERT INTO gw_course_tests (course_id, title, description, test_type, total_points, is_published, created_by)
      VALUES (
        v_course_id, q.quiz->>'title', q.quiz->>'description', 'quiz',
        coalesce((SELECT sum(coalesce((qq->>'points')::int, 10)) FROM jsonb_array_elements(q.quiz->'questions') qq), 0),
        false, auth.uid()
      ) RETURNING id INTO v_test_id;
      v_quiz_count := v_quiz_count + 1;

      FOR x IN
        SELECT value AS qn, (ordinality - 1) AS pos
        FROM jsonb_array_elements(coalesce(q.quiz->'questions', '[]'::jsonb)) WITH ORDINALITY
      LOOP
        IF x.qn->>'type' = 'multiple_choice' THEN
          v_opts := (
            SELECT jsonb_agg(jsonb_build_object('id', chr(97 + (ch.ord - 1)::int), 'text', ch.val))
            FROM jsonb_array_elements_text(x.qn->'choices') WITH ORDINALITY AS ch(val, ord)
          );
          v_correct := to_jsonb(chr(97 + (x.qn->>'correct_index')::int));
        ELSIF x.qn->>'type' = 'true_false' THEN
          v_opts := NULL;
          v_correct := to_jsonb((x.qn->>'correct_answer')::boolean);
        ELSE
          RAISE EXCEPTION 'unsupported question type %', x.qn->>'type';
        END IF;

        INSERT INTO gw_course_test_questions (test_id, position, question_type, prompt, options, correct_answer, explanation, points)
        VALUES (
          v_test_id, x.pos::int, x.qn->>'type', x.qn->>'prompt', v_opts, v_correct,
          x.qn->>'explanation', coalesce((x.qn->>'points')::int, 10)
        );
      END LOOP;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'course_id', v_course_id,
    'course_code', v_code,
    'title', v_title,
    'module_count', v_module_count,
    'assignment_count', v_assignment_count,
    'session_count', v_session_count,
    'quiz_count', v_quiz_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.assistant_create_course(jsonb) TO authenticated;
