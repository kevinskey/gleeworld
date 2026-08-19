\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _fx ON COMMIT DROP AS
SELECT t.id AS tenant,
       (SELECT m.user_id FROM gw_tenant_members m WHERE m.tenant_id=t.id AND m.role='admin' LIMIT 1) AS admin,
       (SELECT p.user_id FROM gw_profiles p WHERE p.tenant_id=t.id AND p.user_id IS NOT NULL
          AND p.user_id <> (SELECT m2.user_id FROM gw_tenant_members m2 WHERE m2.tenant_id=t.id AND m2.role='admin' LIMIT 1) LIMIT 1) AS student_uid,
       (SELECT id FROM gw_all_state_programs WHERE slug='georgia-asc-11-12-2026-27') AS program
  FROM gw_tenants t WHERE t.slug='demo-choir';

DO $$
DECLARE f record; cid uuid; pid uuid; rid uuid; sprofile uuid; n int; url text;
BEGIN
  SELECT * INTO f FROM _fx;
  SELECT id INTO sprofile FROM gw_profiles WHERE user_id=f.student_uid;

  -- Admin: cohort + participation + a 'recording' task.
  PERFORM set_config('request.jwt.claims', json_build_object('tenant_id',f.tenant::text,'role','authenticated','sub',f.admin::text)::text,true);
  SET LOCAL ROLE authenticated;
  INSERT INTO gw_all_state_cohorts (program_id,name) VALUES (f.program,'SUB TEST') RETURNING id INTO cid;
  INSERT INTO gw_all_state_participations (cohort_id,student_id,program_id) VALUES (cid,sprofile,f.program) RETURNING id INTO pid;
  INSERT INTO gw_all_state_tasks (participation_id,cohort_id,title,task_type) VALUES (pid,cid,'Record your solo','recording');
  RESET ROLE;

  -- Student: own a recording, submit it, auto-complete flows.
  PERFORM set_config('request.jwt.claims', json_build_object('tenant_id',f.tenant::text,'role','authenticated','sub',f.student_uid::text)::text,true);
  SET LOCAL ROLE authenticated;
  INSERT INTO gw_practice_recordings (user_id,audio_path,audio_url,title,duration_sec)
  VALUES (f.student_uid,'test/x.webm','https://example.invalid/x.webm','SUB TEST take',42) RETURNING id INTO rid;
  INSERT INTO gw_all_state_practice_links (participation_id,tool,external_ref)
  VALUES (pid,'recording',rid::text);
  UPDATE gw_all_state_tasks SET completed_at=now(), completed_by=f.student_uid
   WHERE participation_id=pid AND task_type='recording' AND completed_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RESET ROLE; RAISE EXCEPTION 'FAIL: student could not complete the recording task (%)', n; END IF;
  RESET ROLE;

  -- Director: sees the link AND can read the recording row (the new policy).
  PERFORM set_config('request.jwt.claims', json_build_object('tenant_id',f.tenant::text,'role','authenticated','sub',f.admin::text)::text,true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM gw_all_state_practice_links WHERE participation_id=pid AND tool='recording';
  IF n <> 1 THEN RESET ROLE; RAISE EXCEPTION 'FAIL: director cannot see the submission link'; END IF;
  SELECT r.audio_url INTO url FROM gw_practice_recordings r WHERE r.id=rid;
  IF url IS NULL THEN RESET ROLE; RAISE EXCEPTION 'FAIL: director cannot read the student recording row'; END IF;
  RESET ROLE;
  RAISE NOTICE 'PASS: student submitted + task auto-completed; membership-admin director sees link and audio';
END $$;
ROLLBACK;
