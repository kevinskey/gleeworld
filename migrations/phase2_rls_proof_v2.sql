-- Phase 2 RLS proof v2: each test wrapped in its own transaction
-- so SET LOCAL ROLE actually takes effect.

-- Clean up the bad insert from v1
DELETE FROM public.gw_courses WHERE course_code = 'EVIL 999';

\echo ''
\echo '=== Setup: course counts by tenant (as superuser, RLS bypassed) ==='
SELECT t.slug, COUNT(c.id) FROM public.gw_tenants t
LEFT JOIN public.gw_courses c ON c.tenant_id = t.id
GROUP BY t.slug ORDER BY t.slug;

\echo ''
\echo '=== TEST 1: authenticated WITHOUT tenant_id claim → expect 0 rows ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{}';
SELECT current_user, COUNT(*) AS visible_rows FROM public.gw_courses;
ROLLBACK;

\echo ''
\echo '=== TEST 2: authenticated as Spelman tenant → expect 4 rows ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='spelman'))::text,
  true
);
SELECT current_user, COUNT(*) AS visible_rows FROM public.gw_courses;
SELECT course_code, title FROM public.gw_courses ORDER BY course_code;
ROLLBACK;

\echo ''
\echo '=== TEST 3: authenticated as TestCo tenant → expect 1 row (only TST 101) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='testco'))::text,
  true
);
SELECT current_user, COUNT(*) AS visible_rows FROM public.gw_courses;
SELECT course_code, title FROM public.gw_courses ORDER BY course_code;
ROLLBACK;

\echo ''
\echo '=== TEST 4: authenticated as TestCo trying to INSERT a Spelman row → expect FAIL ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='testco'))::text,
  true
);
DO $$
BEGIN
  INSERT INTO public.gw_courses (title, course_code, is_active, tenant_id)
  SELECT 'Sneaky Insert', 'EVIL 999', true, id FROM public.gw_tenants WHERE slug='spelman';
  RAISE NOTICE 'UNEXPECTED: insert succeeded (RLS leak!)';
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR sqlstate '42501' THEN
    RAISE NOTICE 'OK: insert blocked by RLS (expected)';
END $$;
ROLLBACK;

\echo ''
\echo '=== TEST 5: service_role → expect to see all rows ==='
BEGIN;
SET LOCAL ROLE service_role;
SELECT current_user, COUNT(*) AS visible_rows FROM public.gw_courses;
ROLLBACK;
