-- Prove parent access as the REAL verified demo-choir parent. Rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _fx ON COMMIT DROP AS
SELECT pc.parent_id, pc.student_id AS child_uid, pc.tenant_id AS tenant,
       (SELECT m.user_id FROM gw_tenant_members m WHERE m.tenant_id=pc.tenant_id AND m.role='admin' LIMIT 1) AS admin,
       (SELECT id FROM gw_all_state_programs WHERE slug='georgia-asc-11-12-2026-27') AS program,
       (SELECT p2.id FROM gw_profiles p2 WHERE p2.user_id = pc.student_id) AS child_profile
  FROM gw_parent_children pc WHERE pc.verified LIMIT 1;

DO $$
DECLARE f record; cid uuid; pid uuid; n int; leaked int;
BEGIN
  SELECT * INTO f FROM _fx;
  IF f.child_profile IS NULL THEN RAISE EXCEPTION 'fixture: child has no profile'; END IF;

  -- Admin sets up: cohort + the child's participation with PRIVATE fields set.
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text,'role','authenticated','sub', f.admin::text)::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO gw_all_state_cohorts (program_id, name) VALUES (f.program,'PARENT TEST') RETURNING id INTO cid;
  INSERT INTO gw_all_state_participations (cohort_id, student_id, program_id, status, director_notes, alternate_rank)
  VALUES (cid, f.child_profile, f.program, 'accepted', 'PRIVATE parent must not see', 3) RETURNING id INTO pid;
  INSERT INTO gw_all_state_tasks (participation_id, cohort_id, title, due_at)
  VALUES (pid, cid, 'Registration and payment due', TIMESTAMPTZ '2026-09-15 00:00-04');
  RESET ROLE;

  -- Now act as the parent.
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text,'role','authenticated','sub', f.parent_id::text)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM gw_all_state_my_children WHERE participation_id = pid;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: parent sees % of their child, wanted 1', n; END IF;

  SELECT count(*) INTO n FROM gw_all_state_my_children_dates WHERE participation_id = pid;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: parent sees % dated items, wanted 1', n; END IF;

  -- The projection must not even HAVE the private columns.
  SELECT count(*) INTO leaked FROM information_schema.columns
   WHERE table_name='gw_all_state_my_children'
     AND column_name IN ('status','final_result','alternate_rank','director_notes',
                         'audition_voice_part_id','assigned_voice_part_id');
  IF leaked <> 0 THEN RAISE EXCEPTION 'FAIL: % private columns leaked into the parent view', leaked; END IF;

  -- Base tables stay closed to the parent.
  SELECT count(*) INTO n FROM gw_all_state_participations;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: parent read % rows from the base table', n; END IF;
  SELECT count(*) INTO n FROM gw_all_state_audition_attempts;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: parent read audition attempts'; END IF;

  RESET ROLE;
  RAISE NOTICE 'PASS: verified parent sees their child + deadline; no status/notes/scores; base tables closed';
END $$;
ROLLBACK;
