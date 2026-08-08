-- Acceptance criterion: "A tenant cannot read another tenant's
-- participations. Prove it with a test, not an assertion."
--
-- The existing tenant-RLS test in this directory
-- (message_groups_tenant_rls_test.sql) only asserts that policies EXIST in
-- pg_policies. That would have passed happily on the ensemble tables, which
-- had policies and still leaked across tenants for two months. So this one
-- actually writes rows as two different tenants and reads them back.
--
-- Everything runs inside a transaction and ROLLBACKs — no test data survives.
--
--   psql ... -f supabase/migrations/tests/all_state_tenant_isolation_test.sql

\set ON_ERROR_STOP on
BEGIN;

-- Two real tenants and a real program to hang cohorts off.
CREATE TEMP TABLE _fixture ON COMMIT DROP AS
SELECT
  (SELECT id FROM gw_tenants ORDER BY slug LIMIT 1)        AS tenant_a,
  (SELECT id FROM gw_tenants ORDER BY slug DESC LIMIT 1)   AS tenant_b,
  (SELECT id FROM gw_all_state_programs ORDER BY slug LIMIT 1) AS program,
  (SELECT id FROM gw_profiles ORDER BY id LIMIT 1)         AS student;

DO $$
DECLARE a uuid; b uuid;
BEGIN
  SELECT tenant_a, tenant_b INTO a, b FROM _fixture;
  IF a = b OR a IS NULL OR b IS NULL THEN
    RAISE EXCEPTION 'Need two distinct tenants to prove isolation; got % and %', a, b;
  END IF;
END $$;

-- Insert one cohort + participation per tenant, bypassing RLS as the owner so
-- the fixture itself cannot be the thing that fails.
INSERT INTO gw_all_state_cohorts (id, tenant_id, program_id, name)
SELECT '11111111-1111-1111-1111-111111111111', tenant_a, program, 'ISOLATION TEST A' FROM _fixture;
INSERT INTO gw_all_state_cohorts (id, tenant_id, program_id, name)
SELECT '22222222-2222-2222-2222-222222222222', tenant_b, program, 'ISOLATION TEST B' FROM _fixture;

INSERT INTO gw_all_state_participations (id, tenant_id, cohort_id, student_id, program_id)
SELECT '33333333-3333-3333-3333-333333333333', tenant_a,
       '11111111-1111-1111-1111-111111111111', student, program FROM _fixture;
INSERT INTO gw_all_state_participations (id, tenant_id, cohort_id, student_id, program_id)
SELECT '44444444-4444-4444-4444-444444444444', tenant_b,
       '22222222-2222-2222-2222-222222222222', student, program FROM _fixture;

\echo ''
\echo '=== As tenant A: must see A''s cohort and participation, and ONLY those ==='
DO $$
DECLARE a uuid; n_cohorts int; n_parts int; n_foreign int;
BEGIN
  SELECT tenant_a INTO a FROM _fixture;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', a::text, 'role', 'authenticated',
                      'sub', '00000000-0000-0000-0000-000000000000')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n_cohorts FROM gw_all_state_cohorts
   WHERE name LIKE 'ISOLATION TEST%';
  SELECT count(*) INTO n_parts FROM gw_all_state_participations
   WHERE id IN ('33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');
  SELECT count(*) INTO n_foreign FROM gw_all_state_participations
   WHERE id = '44444444-4444-4444-4444-444444444444';

  RESET ROLE;
  RAISE NOTICE 'tenant A sees % test cohort(s), % test participation(s), % foreign', n_cohorts, n_parts, n_foreign;

  IF n_cohorts <> 1 THEN RAISE EXCEPTION 'FAIL: tenant A should see exactly 1 test cohort, saw %', n_cohorts; END IF;
  IF n_parts   <> 1 THEN RAISE EXCEPTION 'FAIL: tenant A should see exactly 1 test participation, saw %', n_parts; END IF;
  IF n_foreign <> 0 THEN RAISE EXCEPTION 'FAIL: tenant A CAN READ tenant B''s participation (% row(s))', n_foreign; END IF;
END $$;

\echo ''
\echo '=== As tenant B: mirror image ==='
DO $$
DECLARE b uuid; n_foreign int;
BEGIN
  SELECT tenant_b INTO b FROM _fixture;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', b::text, 'role', 'authenticated',
                      'sub', '00000000-0000-0000-0000-000000000000')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n_foreign FROM gw_all_state_participations
   WHERE id = '33333333-3333-3333-3333-333333333333';

  RESET ROLE;
  RAISE NOTICE 'tenant B sees % of tenant A''s participations', n_foreign;
  IF n_foreign <> 0 THEN RAISE EXCEPTION 'FAIL: tenant B CAN READ tenant A''s participation'; END IF;
END $$;

\echo ''
\echo '=== Tenant A must not be able to WRITE into tenant B''s cohort ==='
DO $$
DECLARE a uuid; wrote int := 0;
BEGIN
  SELECT tenant_a INTO a FROM _fixture;
  PERFORM set_config('request.jwt.claims',
    json_build_object('tenant_id', a::text, 'role', 'authenticated',
                      'sub', '00000000-0000-0000-0000-000000000000')::text, true);
  SET LOCAL ROLE authenticated;

  -- Reading zero rows is itself the fence: the UPDATE simply matches nothing.
  UPDATE gw_all_state_participations SET director_notes = 'BREACH'
   WHERE id = '44444444-4444-4444-4444-444444444444';
  GET DIAGNOSTICS wrote = ROW_COUNT;

  RESET ROLE;
  RAISE NOTICE 'tenant A updated % of tenant B''s rows', wrote;
  IF wrote <> 0 THEN RAISE EXCEPTION 'FAIL: tenant A WROTE tenant B''s participation'; END IF;
END $$;

\echo ''
\echo '=== PASS — tenant isolation holds for Layer 2 and Layer 3 ==='

ROLLBACK;
