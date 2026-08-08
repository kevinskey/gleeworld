-- Prove calendar sync + reminders as the real demo-choir admin. Rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _fx ON COMMIT DROP AS
SELECT t.id AS tenant, m.user_id AS admin,
       (SELECT id FROM gw_all_state_programs WHERE slug='georgia-asc-11-12-2026-27') AS program
  FROM gw_tenants t JOIN gw_tenant_members m ON m.tenant_id=t.id AND m.role='admin'
 WHERE t.slug='demo-choir' LIMIT 1;

DO $$
DECLARE f record; cid uuid; pid uuid; n int; n2 int; ev record;
BEGIN
  SELECT * INTO f FROM _fx;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text, 'role','authenticated','sub', f.admin::text)::text, true);
  SET LOCAL ROLE authenticated;

  INSERT INTO gw_all_state_cohorts (program_id, name, created_by)
  VALUES (f.program, 'CAL TEST', f.admin) RETURNING id INTO cid;

  -- Director deadline pegged 10 days before region auditions.
  INSERT INTO gw_all_state_cohort_dates (cohort_id, title, date_type, lead_days, source_date_id)
  SELECT cid, 'Recordings due to me', 'other', 10, d.id
    FROM gw_all_state_dates d JOIN gw_all_state_programs p ON p.id=d.program_id
   WHERE p.id=f.program AND d.title ILIKE '%Region auditions%' LIMIT 1;

  -- 1. Sync creates events (5 dated state rows + 1 cohort row = 6).
  SELECT gw_all_state_sync_cohort_calendar(cid) INTO n;
  IF n <> 6 THEN RAISE EXCEPTION 'FAIL: synced % events, wanted 6', n; END IF;

  -- Cohort deadline must land on 2026-10-28 (Nov 7 minus 10 days).
  SELECT e.* INTO ev FROM gw_events e
   WHERE e.external_source='all_state' AND e.title LIKE '%Recordings due to me%';
  IF to_char(ev.start_date AT TIME ZONE 'America/New_York','YYYY-MM-DD') <> '2026-10-28' THEN
    RAISE EXCEPTION 'FAIL: derived deadline landed on %', ev.start_date;
  END IF;

  -- 2. Re-sync is idempotent: same count, no duplicates.
  SELECT gw_all_state_sync_cohort_calendar(cid) INTO n;
  SELECT count(*) INTO n2 FROM gw_events WHERE external_source='all_state' AND tenant_id=f.tenant;
  IF n2 <> 6 THEN RAISE EXCEPTION 'FAIL: re-sync duplicated events (% rows)', n2; END IF;

  -- 3. State moves its date → re-sync moves the EVENT (and the derived one).
  RESET ROLE;  -- need to edit canon as owner
  UPDATE gw_all_state_dates SET start_at = start_at + interval '14 days'
   WHERE program_id=f.program AND title ILIKE '%Region auditions%';
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text, 'role','authenticated','sub', f.admin::text)::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM gw_all_state_sync_cohort_calendar(cid);
  SELECT e.* INTO ev FROM gw_events e
   WHERE e.external_source='all_state' AND e.title LIKE '%Recordings due to me%';
  IF to_char(ev.start_date AT TIME ZONE 'America/New_York','YYYY-MM-DD') <> '2026-11-11' THEN
    RAISE EXCEPTION 'FAIL: derived deadline did not follow the moved state date (got %)', ev.start_date;
  END IF;

  -- 4. Reminders: give the cohort a student with a login and a task due tomorrow.
  INSERT INTO gw_all_state_participations (cohort_id, student_id, program_id)
  SELECT cid, pr.id, f.program FROM gw_profiles pr
   WHERE pr.tenant_id=f.tenant AND pr.user_id IS NOT NULL LIMIT 1 RETURNING id INTO pid;
  INSERT INTO gw_all_state_tasks (participation_id, cohort_id, title, due_at)
  VALUES (pid, cid, 'REMINDER TEST task', now() + interval '20 hours');

  RESET ROLE;
  SELECT gw_all_state_send_reminders() INTO n;
  IF n < 2 THEN RAISE EXCEPTION 'FAIL: expected student reminder + director digest, sent %', n; END IF;
  -- Idempotent within 20h:
  SELECT gw_all_state_send_reminders() INTO n2;
  IF n2 <> 0 THEN RAISE EXCEPTION 'FAIL: second run re-sent % reminders', n2; END IF;

  RAISE NOTICE 'PASS: 6 events synced, idempotent, derived date follows the state (10/28 -> 11/11), % reminders sent once', n;
END $$;
ROLLBACK;
