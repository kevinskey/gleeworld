-- Re-do tenant isolation as RESTRICTIVE policies so they AND with the
-- pre-existing permissive role/admin policies instead of being OR'd away.

BEGIN;

DROP POLICY IF EXISTS tenant_isolation_select ON public.gw_courses;
DROP POLICY IF EXISTS tenant_isolation_modify ON public.gw_courses;

-- Restrictive policy: tenant_id MUST match current tenant
CREATE POLICY tenant_isolation_restrict ON public.gw_courses
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

COMMIT;

\echo ''
\echo '=== TEST 2 (Spelman) — expect 4 rows ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='spelman'),
    'sub', '00000000-0000-0000-0000-000000000000',
    'role', 'authenticated'
  )::text, true);
SELECT current_user, COUNT(*) AS visible FROM public.gw_courses;
SELECT course_code FROM public.gw_courses ORDER BY course_code;
ROLLBACK;

\echo ''
\echo '=== TEST 3 (TestCo) — expect 1 row ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='testco'),
    'sub', '00000000-0000-0000-0000-000000000000',
    'role', 'authenticated'
  )::text, true);
SELECT current_user, COUNT(*) AS visible FROM public.gw_courses;
SELECT course_code FROM public.gw_courses ORDER BY course_code;
ROLLBACK;

\echo ''
\echo '=== TEST 1 (no tenant_id claim) — expect 0 rows ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}';
SELECT current_user, COUNT(*) AS visible FROM public.gw_courses;
ROLLBACK;

\echo ''
\echo '=== TEST 5 (service_role) — expect all rows (RLS bypassed) ==='
BEGIN;
SET LOCAL ROLE service_role;
SELECT current_user, COUNT(*) AS visible FROM public.gw_courses;
ROLLBACK;
