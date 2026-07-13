-- Run against a scratch DB with all migrations through
-- 20260713220000_assistant_course_builder.sql applied. Never prod.
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

ROLLBACK;
