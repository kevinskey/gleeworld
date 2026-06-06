-- Phase 2 PROOF: Enable RLS on gw_courses, validate tenant isolation works.
-- Run as supabase_admin (superuser) for DDL, then SET ROLE authenticated to
-- test actual RLS enforcement (superuser BYPASSRLS).

BEGIN;

-- 1. Add a second tenant for cross-tenant isolation test
INSERT INTO public.gw_tenants (slug, name, subdomain)
VALUES ('testco', 'Test Co', 'testco.gleeworld.org')
ON CONFLICT (slug) DO NOTHING;

-- 2. Plant one course in testco so we can test cross-tenant leakage
INSERT INTO public.gw_courses (title, course_code, is_active, tenant_id)
SELECT 'TestCo Welcome', 'TST 101', true, t.id
FROM public.gw_tenants t WHERE t.slug = 'testco'
  AND NOT EXISTS (
    SELECT 1 FROM public.gw_courses WHERE course_code = 'TST 101'
  );

-- 3. Enable RLS on gw_courses + policies
ALTER TABLE public.gw_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON public.gw_courses;
DROP POLICY IF EXISTS tenant_isolation_modify ON public.gw_courses;

-- SELECT: only rows in current tenant
CREATE POLICY tenant_isolation_select ON public.gw_courses
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- INSERT/UPDATE/DELETE: only into/from current tenant
CREATE POLICY tenant_isolation_modify ON public.gw_courses
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

COMMIT;

-- ============================================================
-- TEST: simulate PostgREST by SET ROLE authenticated + JWT claims
-- ============================================================

\echo ''
\echo '=== Setup: tenants in registry ==='
SELECT slug, name FROM public.gw_tenants ORDER BY slug;

\echo ''
\echo '=== Setup: course counts by tenant (as superuser, RLS bypassed) ==='
SELECT t.slug, COUNT(c.id) FROM public.gw_tenants t
LEFT JOIN public.gw_courses c ON c.tenant_id = t.id
GROUP BY t.slug ORDER BY t.slug;

\echo ''
\echo '=== TEST 1: authenticated WITHOUT tenant_id claim → expect 0 rows ==='
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{}', true);
SELECT COUNT(*) AS visible_rows FROM public.gw_courses;
RESET ROLE;

\echo ''
\echo '=== TEST 2: authenticated as Spelman tenant → expect 4 rows ==='
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='spelman'))::text,
  true
);
SELECT COUNT(*) AS visible_rows FROM public.gw_courses;
SELECT course_code, title FROM public.gw_courses ORDER BY course_code;
RESET ROLE;

\echo ''
\echo '=== TEST 3: authenticated as TestCo tenant → expect 1 row (only TST 101) ==='
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='testco'))::text,
  true
);
SELECT COUNT(*) AS visible_rows FROM public.gw_courses;
SELECT course_code, title FROM public.gw_courses ORDER BY course_code;
RESET ROLE;

\echo ''
\echo '=== TEST 4: authenticated as TestCo trying to INSERT a Spelman row → expect FAIL ==='
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
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE NOTICE 'OK: insert blocked by RLS (expected)';
END $$;
RESET ROLE;

\echo ''
\echo '=== TEST 5: service_role bypass → expect to see all 5 rows ==='
SET LOCAL ROLE service_role;
SELECT COUNT(*) AS visible_rows FROM public.gw_courses;
RESET ROLE;
