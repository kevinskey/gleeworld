-- academy_roll_call_test.sql — run AFTER the migration; everything rolls back.
BEGIN;

-- Symbol derivation is deterministic and in range.
DO $$
DECLARE v_seed uuid := '00000000-0000-0000-0000-000000000001';
        v_a int; v_b int;
BEGIN
  v_a := public.roll_call_symbol_for_slot(v_seed, 1000);
  v_b := public.roll_call_symbol_for_slot(v_seed, 1000);
  ASSERT v_a = v_b, 'derivation must be deterministic';
  ASSERT v_a BETWEEN 0 AND 7, 'symbol index in 0..7';
  ASSERT (SELECT count(DISTINCT public.roll_call_symbol_for_slot(v_seed, s))
          FROM generate_series(1, 200) s) > 1, 'symbols must vary across slots';
END $$;

-- Seed trigger fires for roll_call sessions.
DO $$
DECLARE v_course record; v_session uuid; v_tenant uuid; v_has_tenant_col boolean;
BEGIN
  SELECT id, (to_jsonb(c) ->> 'tenant_id')::uuid AS tenant_id INTO v_course
  FROM gw_courses c LIMIT 1;
  IF v_course IS NULL THEN RAISE NOTICE 'no course to test with, skipping'; RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gw_attendance_sessions' AND column_name = 'tenant_id'
  ) INTO v_has_tenant_col;

  IF v_has_tenant_col AND v_course.tenant_id IS NOT NULL THEN
    EXECUTE format('INSERT INTO gw_attendance_sessions (course_id, title, mode, status, tenant_id) VALUES (%L, %L, %L, %L, %L) RETURNING id',
      v_course.id, 'RC test', 'roll_call', 'open', v_course.tenant_id)
    INTO v_session;
  ELSE
    INSERT INTO gw_attendance_sessions (course_id, title, mode, status)
    VALUES (v_course.id, 'RC test', 'roll_call', 'open') RETURNING id INTO v_session;
  END IF;

  ASSERT EXISTS (SELECT 1 FROM gw_attendance_session_secrets WHERE session_id = v_session),
    'seed row must exist after insert';
END $$;

-- Unauthenticated check-in is rejected (auth.uid() is NULL under psql).
DO $$
DECLARE v_res jsonb;
BEGIN
  v_res := public.roll_call_check_in(gen_random_uuid(), 3);
  ASSERT v_res->>'error' = 'NOT_AUTHENTICATED', 'expected NOT_AUTHENTICATED, got ' || v_res::text;
END $$;

ROLLBACK;
