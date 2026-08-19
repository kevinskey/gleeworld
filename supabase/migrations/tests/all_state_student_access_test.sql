-- Acceptance criteria being proved here:
--   "A student sees their own participation, tasks and practice. Not the
--    director's notes, not other students' records, not audition scores."
--
-- Asserted by acting AS a real student (a JWT sub belonging to a real
-- gw_profiles row), not by inspecting policy metadata. Rolls back.
--
--   psql ... -f supabase/migrations/tests/all_state_student_access_test.sql

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _fx ON COMMIT DROP AS
SELECT
  p.id       AS student_profile,
  p.user_id  AS student_uid,
  p.tenant_id AS tenant,
  (SELECT id FROM gw_all_state_programs ORDER BY slug LIMIT 1) AS program,
  (SELECT id FROM gw_profiles o WHERE o.user_id IS NOT NULL AND o.id <> p.id
     AND o.tenant_id = p.tenant_id ORDER BY o.id LIMIT 1) AS other_profile
FROM gw_profiles p
WHERE p.user_id IS NOT NULL AND p.tenant_id IS NOT NULL
ORDER BY p.id LIMIT 1;

DO $$
DECLARE f record;
BEGIN
  SELECT * INTO f FROM _fx;
  IF f.student_uid IS NULL OR f.other_profile IS NULL OR f.program IS NULL THEN
    RAISE EXCEPTION 'Fixture needs two profiles with logins in one tenant plus a program';
  END IF;
END $$;

-- A cohort with TWO students: ours, and somebody else's.
INSERT INTO gw_all_state_cohorts (id, tenant_id, program_id, name)
SELECT 'aaaaaaaa-0000-0000-0000-000000000001', tenant, program, 'STUDENT ACCESS TEST' FROM _fx;

INSERT INTO gw_all_state_participations (id, tenant_id, cohort_id, student_id, program_id, director_notes)
SELECT 'bbbbbbbb-0000-0000-0000-000000000001', tenant,
       'aaaaaaaa-0000-0000-0000-000000000001', student_profile, program,
       'PRIVATE: struggling with the high passage' FROM _fx;
INSERT INTO gw_all_state_participations (id, tenant_id, cohort_id, student_id, program_id, director_notes)
SELECT 'bbbbbbbb-0000-0000-0000-000000000002', tenant,
       'aaaaaaaa-0000-0000-0000-000000000001', other_profile, program,
       'PRIVATE: another student notes' FROM _fx;

INSERT INTO gw_all_state_audition_attempts (id, tenant_id, participation_id, round_number, score, adjudicator_notes)
SELECT 'cccccccc-0000-0000-0000-000000000001', tenant,
       'bbbbbbbb-0000-0000-0000-000000000001', 1, 87.5, 'PRIVATE: flat on the descending line' FROM _fx;

INSERT INTO gw_all_state_tasks (id, tenant_id, participation_id, cohort_id, title)
SELECT 'dddddddd-0000-0000-0000-000000000001', tenant,
       'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
       'Practise: Required scales' FROM _fx;
INSERT INTO gw_all_state_tasks (id, tenant_id, participation_id, cohort_id, title)
SELECT 'dddddddd-0000-0000-0000-000000000002', tenant,
       'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
       'Somebody else''s task' FROM _fx;

\echo ''
\echo '=== Acting as the student ==='
DO $$
DECLARE
  f record;
  v_base int; v_view int; v_attempt_base int; v_attempt_view int;
  v_own_tasks int; v_all_tasks int; v_title text;
BEGIN
  SELECT * INTO f FROM _fx;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text, 'role', 'authenticated',
                      'sub', f.student_uid::text)::text, true);
  SET LOCAL ROLE authenticated;

  -- 1. The base table must be closed to a student entirely.
  SELECT count(*) INTO v_base FROM gw_all_state_participations;

  -- 2. The curated view must show exactly their own row.
  SELECT count(*) INTO v_view FROM gw_all_state_my_participations;

  -- 3. Audition scores/notes: base closed, view shows the round only.
  SELECT count(*) INTO v_attempt_base FROM gw_all_state_audition_attempts;
  SELECT count(*) INTO v_attempt_view FROM gw_all_state_my_audition_attempts;

  -- 4. Tasks: their own only, never the other student's.
  SELECT count(*) INTO v_own_tasks FROM gw_all_state_tasks
   WHERE participation_id = 'bbbbbbbb-0000-0000-0000-000000000001';
  SELECT count(*) INTO v_all_tasks FROM gw_all_state_tasks;

  RESET ROLE;

  RAISE NOTICE 'participations base=%  my-view=%', v_base, v_view;
  RAISE NOTICE 'attempts      base=%  my-view=%', v_attempt_base, v_attempt_view;
  RAISE NOTICE 'tasks         own=%   visible-total=%', v_own_tasks, v_all_tasks;

  IF v_base <> 0 THEN
    RAISE EXCEPTION 'FAIL: student read the participations base table (% rows) — director_notes exposed', v_base;
  END IF;
  IF v_view <> 1 THEN
    RAISE EXCEPTION 'FAIL: student should see exactly 1 row in their view, saw %', v_view;
  END IF;
  IF v_attempt_base <> 0 THEN
    RAISE EXCEPTION 'FAIL: student read raw audition attempts (% rows) — scores exposed', v_attempt_base;
  END IF;
  IF v_attempt_view <> 1 THEN
    RAISE EXCEPTION 'FAIL: student should see 1 attempt in their view, saw %', v_attempt_view;
  END IF;
  IF v_own_tasks <> 1 THEN
    RAISE EXCEPTION 'FAIL: student should see their 1 task, saw %', v_own_tasks;
  END IF;
  IF v_all_tasks <> 1 THEN
    RAISE EXCEPTION 'FAIL: student saw % tasks — another student''s checklist is visible', v_all_tasks;
  END IF;
END $$;

\echo ''
\echo '=== A student may tick a task done, but not rewrite it ==='
DO $$
DECLARE f record; n int; failed boolean := false;
BEGIN
  SELECT * INTO f FROM _fx;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text, 'role', 'authenticated',
                      'sub', f.student_uid::text)::text, true);
  SET LOCAL ROLE authenticated;

  UPDATE gw_all_state_tasks SET completed_at = now()
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RESET ROLE; RAISE EXCEPTION 'FAIL: student could not complete their own task'; END IF;

  -- The column grant, not the policy, is what must stop this.
  BEGIN
    UPDATE gw_all_state_tasks SET title = 'HACKED'
     WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN
    failed := true;
  END;

  RESET ROLE;
  RAISE NOTICE 'student completed own task; title rewrite blocked = %', failed;
  IF NOT failed THEN
    RAISE EXCEPTION 'FAIL: student rewrote a task title — column grant is missing';
  END IF;
END $$;

\echo ''
\echo '=== PASS — student sees their own work and nothing private ==='

ROLLBACK;
