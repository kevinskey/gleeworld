-- Run against a scratch DB bootstrapped with
-- tests/assistant_course_builder_bootstrap.sql and then migrated through
-- 20260713220000_assistant_course_builder.sql. Never prod.
-- The RLS section below runs as the NON-OWNER role gw_test_authenticated
-- (created by the bootstrap): table owners bypass RLS, so only a non-owner
-- run proves the policies actually work.
BEGIN;

-- Columns + constraint
DO $$ BEGIN
  ASSERT (SELECT column_default FROM information_schema.columns
          WHERE table_name = 'gw_courses' AND column_name = 'status') LIKE '%published%',
    'gw_courses.status default must be published';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'gw_courses' AND column_name = 'pending_enrollments'),
    'gw_courses.pending_enrollments missing';
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gw_courses_status_check'),
    'status check constraint missing';
END $$;

-- Draft-hiding SELECT policy predicate
DO $$ DECLARE q text; BEGIN
  SELECT qual INTO q FROM pg_policies
  WHERE tablename = 'gw_courses' AND policyname = 'Anyone can view active courses';
  ASSERT q ILIKE '%status%published%', 'select policy must gate on status';
  ASSERT q ILIKE '%instructor_id%', 'select policy must carve out the course owner';
END $$;

-- The 20251203 blanket SELECT policy (USING true) must be gone — permissive
-- policies OR together, so leaving it would leak drafts to every user — and
-- course editors must have an INSERT path into gw_courses (prod's write
-- policies are admin-flag only, which would block instructor RPC callers).
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'gw_courses' AND policyname = 'Authenticated users can view courses'),
    'leaky blanket SELECT policy must be dropped';
  ASSERT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'gw_courses' AND policyname = 'Course editors can insert courses'),
    'course editors need an INSERT policy on gw_courses';
END $$;

-- Normalized satellite policies accept both super_admin spellings
DO $$ DECLARE fn text; BEGIN
  SELECT prosrc INTO fn FROM pg_proc WHERE proname = 'is_course_editor';
  ASSERT fn ILIKE '%super_admin%' AND fn ILIKE '%super-admin%',
    'is_course_editor must accept both super_admin spellings';
END $$;

-- Functions exist
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expand_class_sessions'), 'expand fn missing';
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assistant_create_course'), 'rpc missing';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE proname = 'assistant_create_course') = false,
    'assistant_create_course must be SECURITY INVOKER';
END $$;

-- expand_class_sessions is deterministic and correct:
-- Mon/Wed 2026-08-24..2026-09-11 = M24 W26 M31 W2 M7 W9 = 6 sessions
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM expand_class_sessions(
    '[{"weekday":1,"start_time":"10:00","end_time":"10:50"},
      {"weekday":3,"start_time":"10:00","end_time":"10:50"}]'::jsonb,
    '2026-08-24', '2026-09-11', '[]'::jsonb)) = 6, 'weekday expansion wrong';
  -- Break removes Mon 9/7 and Wed 9/9
  ASSERT (SELECT count(*) FROM expand_class_sessions(
    '[{"weekday":1,"start_time":"10:00","end_time":"10:50"},
      {"weekday":3,"start_time":"10:00","end_time":"10:50"}]'::jsonb,
    '2026-08-24', '2026-09-11', '[{"from":"2026-09-07","to":"2026-09-11"}]'::jsonb)) = 4,
    'break exclusion wrong';
  -- Empty patterns → zero sessions, no error
  ASSERT (SELECT count(*) FROM expand_class_sessions('[]'::jsonb, '2026-08-24', '2026-09-11')) = 0,
    'empty patterns should expand to zero';
END $$;

-- ---------------------------------------------------------------------------
-- RLS smoke test: run the RPC as a NON-OWNER role so RLS is actually enforced.
-- Identity: Test Instructor (role 'instructor', is_admin false) — exercises
-- is_course_editor()'s role-string branch, not the admin-flag branch.
-- ---------------------------------------------------------------------------
SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE gw_test_authenticated;

DO $$ DECLARE r jsonb; v_status text; BEGIN
  r := assistant_create_course('{
    "title":"Scratch Course","start_date":"2026-08-24","end_date":"2026-09-11",
    "meeting_patterns":[{"weekday":1,"start_time":"10:00","end_time":"10:50"}],
    "modules":[{"title":"Week 1","week_number":1,"assignments":[
      {"title":"Hello","points":10,"due_at":"2026-08-31T23:59:00-04:00"}]}],
    "rubric":{"title":"R","criteria":[{"name":"C","max_points":10,"weight_percentage":100}]},
    "repertoire":[{"title":"Lift Every Voice and Sing"}]
  }'::jsonb);
  ASSERT (r->>'module_count')::int = 1, 'module count';
  ASSERT (r->>'assignment_count')::int = 1, 'assignment count';
  ASSERT (r->>'session_count')::int = 3, 'session count (Mon 8/24, 8/31, 9/7)';
  -- Owner carve-out: the draft must be visible to its creator through RLS.
  SELECT status INTO v_status FROM gw_courses WHERE id = (r->>'course_id')::uuid;
  ASSERT v_status = 'draft', 'creator must see own draft with status=draft';
  -- Stash the id for the student-visibility check (transaction-local GUC).
  PERFORM set_config('test.course_id', r->>'course_id', true);
END $$;

-- Editors must NOT be able to mint template rows: list_course_templates() is
-- SECURITY DEFINER and surfaces active templates cross-tenant, so the INSERT
-- policy's is_template = false is load-bearing.
DO $$ DECLARE rejected boolean := false; BEGIN
  BEGIN
    INSERT INTO gw_courses (title, is_template, created_by, tenant_id)
    VALUES ('Sneaky Template', true, auth.uid(), current_tenant_id());
  EXCEPTION WHEN others THEN
    rejected := SQLERRM ILIKE '%row-level security%';
  END;
  ASSERT rejected, 'editor INSERT with is_template=true must be rejected by RLS';
END $$;

-- Missing start_date must raise (NULL-date bypass guard), still as instructor.
DO $$ DECLARE raised boolean := false; BEGIN
  BEGIN
    PERFORM assistant_create_course('{
      "title":"No Dates","end_date":"2026-09-11",
      "modules":[{"title":"Week 1"}]
    }'::jsonb);
  EXCEPTION WHEN others THEN
    raised := SQLERRM ILIKE '%start_date/end_date invalid%';
  END;
  ASSERT raised, 'RPC must reject a spec with no start_date';
END $$;

RESET ROLE;

-- Draft hiding: the student identity must NOT see the instructor's draft.
SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000003';
SET LOCAL ROLE gw_test_authenticated;

DO $$ BEGIN
  ASSERT (SELECT count(*) FROM gw_courses
          WHERE id = current_setting('test.course_id')::uuid) = 0,
    'draft course must be invisible to non-owner students';
END $$;

RESET ROLE;

-- Publish lifecycle: the instructor (non-admin-flag editor) must be able to
-- publish their own draft via the owner-scoped UPDATE policy...
SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE gw_test_authenticated;

DO $$ DECLARE n int; v_status text; BEGIN
  UPDATE gw_courses SET status = 'published'
  WHERE id = current_setting('test.course_id')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'editor must be able to publish their own draft';
  SELECT status INTO v_status FROM gw_courses
  WHERE id = current_setting('test.course_id')::uuid;
  ASSERT v_status = 'published', 'published row must remain visible to its owner';
END $$;

-- ...but must NOT be able to flip their course into a cross-tenant template.
DO $$ DECLARE rejected boolean := false; BEGIN
  BEGIN
    UPDATE gw_courses SET is_template = true
    WHERE id = current_setting('test.course_id')::uuid;
  EXCEPTION WHEN others THEN
    rejected := SQLERRM ILIKE '%row-level security%';
  END;
  ASSERT rejected, 'editor UPDATE flipping is_template=true must be rejected by RLS';
END $$;

RESET ROLE;

-- Once published, the course IS visible to the student identity — completes
-- the draft → publish lifecycle proof.
SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000003';
SET LOCAL ROLE gw_test_authenticated;

DO $$ BEGIN
  ASSERT (SELECT count(*) FROM gw_courses
          WHERE id = current_setting('test.course_id')::uuid) = 1,
    'published course must be visible to students';
END $$;

RESET ROLE;

ROLLBACK;
