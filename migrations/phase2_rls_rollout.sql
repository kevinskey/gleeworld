-- Phase 2 ROLLOUT: Apply RESTRICTIVE tenant_isolation policy to every
-- tenant-scoped gw_* table. Same global whitelist as Phase 1.
-- Non-destructive: only adds policy + enables RLS. Pre-existing
-- permissive policies (role/admin checks) remain in effect; restrictive
-- policy ANDs on top to enforce tenant isolation.

BEGIN;

DO $$
DECLARE
  tbl text;
  applied int := 0;
  global_tables text[] := ARRAY[
    'gw_tenants', 'gw_tenant_members',
    'gw_feature_flags', 'gw_app_functions',
    'gw_permissions', 'gw_roles', 'gw_tax_regions',
    'gw_webhook_events'
  ];
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'gw_%'
      AND NOT (tablename = ANY(global_tables))
    ORDER BY tablename
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_restrict ON public.%I '
      'AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (tenant_id = public.current_tenant_id()) '
      'WITH CHECK (tenant_id = public.current_tenant_id())',
      tbl
    );
    applied := applied + 1;
  END LOOP;
  RAISE NOTICE 'tenant_isolation_restrict applied to % tables', applied;
END $$;

COMMIT;

-- =========================================================
-- Verification
-- =========================================================

\echo ''
\echo '=== Policy coverage: tables WITH tenant_isolation_restrict ==='
SELECT COUNT(*) AS tables_with_restrict
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE p.polname = 'tenant_isolation_restrict';

\echo ''
\echo '=== Tables WITHOUT tenant_isolation_restrict (should be globals only) ==='
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'gw_%'
  AND tablename NOT IN (
    SELECT c.relname FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    WHERE p.polname = 'tenant_isolation_restrict'
  )
ORDER BY tablename;

\echo ''
\echo '=== Smoke test: Spelman should see all 4 courses; TestCo should see 1 ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM gw_tenants WHERE slug='spelman'),
                    'role', 'authenticated',
                    'sub', '00000000-0000-0000-0000-000000000000')::text, true);
SELECT 'spelman' AS as_tenant, COUNT(*) FROM gw_courses
UNION ALL SELECT 'spelman_profiles', COUNT(*) FROM gw_profiles
UNION ALL SELECT 'spelman_branding', COUNT(*) FROM gw_branding_settings;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM gw_tenants WHERE slug='testco'),
                    'role', 'authenticated',
                    'sub', '00000000-0000-0000-0000-000000000000')::text, true);
SELECT 'testco' AS as_tenant, COUNT(*) FROM gw_courses
UNION ALL SELECT 'testco_profiles', COUNT(*) FROM gw_profiles
UNION ALL SELECT 'testco_branding', COUNT(*) FROM gw_branding_settings;
ROLLBACK;
