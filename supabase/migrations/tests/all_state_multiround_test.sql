-- Acceptance criterion 5: a multi-round audition is recorded correctly,
-- including a student who auditions as Soprano II and is placed Soprano I.
-- Runs as the real demo-choir admin. Rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _fx ON COMMIT DROP AS
SELECT t.id AS tenant, m.user_id AS admin,
       (SELECT id FROM gw_all_state_programs WHERE slug='georgia-asc-11-12-2026-27') AS program
  FROM gw_tenants t JOIN gw_tenant_members m ON m.tenant_id=t.id AND m.role='admin'
 WHERE t.slug='demo-choir' LIMIT 1;

DO $$
DECLARE f record; cid uuid; pid uuid; s2 uuid; s1 uuid; n int; adv boolean;
BEGIN
  SELECT * INTO f FROM _fx;
  SELECT id INTO s2 FROM gw_all_state_voice_parts WHERE program_id=f.program AND code='S2';
  SELECT id INTO s1 FROM gw_all_state_voice_parts WHERE program_id=f.program AND code='S1';
  IF s1 IS NULL OR s2 IS NULL THEN RAISE EXCEPTION 'fixture: S1/S2 parts missing'; END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', f.tenant::text, 'role','authenticated','sub', f.admin::text)::text, true);
  SET LOCAL ROLE authenticated;

  INSERT INTO gw_all_state_cohorts (program_id, name) VALUES (f.program, 'C5 TEST') RETURNING id INTO cid;
  INSERT INTO gw_all_state_participations (cohort_id, student_id, program_id, audition_voice_part_id)
  SELECT cid, p.id, f.program, s2 FROM gw_profiles p
   WHERE p.tenant_id=f.tenant AND p.voice_part='S2' LIMIT 1 RETURNING id INTO pid;
  IF pid IS NULL THEN
    -- fall back to any student if no S2 profile exists
    INSERT INTO gw_all_state_participations (cohort_id, student_id, program_id, audition_voice_part_id)
    SELECT cid, p.id, f.program, s2 FROM gw_profiles p
     WHERE p.tenant_id=f.tenant LIMIT 1 RETURNING id INTO pid;
  END IF;

  -- Round 1: region audition, advanced.
  INSERT INTO gw_all_state_audition_attempts
    (participation_id, round_number, round_label, scheduled_at, format, score, score_scale, advanced, result)
  VALUES (pid, 1, 'Region auditions', TIMESTAMPTZ '2026-11-07 09:00-05', 'live', 87.5, 100, true, 'advanced');

  -- Round 2: final audition, accepted.
  INSERT INTO gw_all_state_audition_attempts
    (participation_id, round_number, round_label, scheduled_at, format, advanced, result)
  VALUES (pid, 2, 'Final auditions', TIMESTAMPTZ '2027-01-21 09:00-05', 'live', true, 'accepted');

  -- Placement on a DIFFERENT part than auditioned.
  UPDATE gw_all_state_participations
     SET assigned_voice_part_id = s1, status='accepted' WHERE id = pid;

  -- Verify the full picture reads back.
  SELECT count(*) INTO n FROM gw_all_state_audition_attempts WHERE participation_id=pid;
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL: % rounds, wanted 2', n; END IF;
  SELECT bool_and(advanced) INTO adv FROM gw_all_state_audition_attempts WHERE participation_id=pid;
  IF NOT adv THEN RAISE EXCEPTION 'FAIL: advancement lost'; END IF;
  PERFORM 1 FROM gw_all_state_participations
    WHERE id=pid AND audition_voice_part_id=s2 AND assigned_voice_part_id=s1 AND status='accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: S2-auditioned/S1-placed not recorded'; END IF;

  -- UNIQUE(participation, round) must reject a duplicate round.
  BEGIN
    INSERT INTO gw_all_state_audition_attempts (participation_id, round_number) VALUES (pid, 1);
    RAISE EXCEPTION 'FAIL: duplicate round 1 was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RESET ROLE;
  RAISE NOTICE 'PASS: two rounds recorded, S2 auditioned -> S1 placed, duplicate round rejected';
END $$;
ROLLBACK;
