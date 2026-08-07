-- Read-only audit: which gw_* tables are missing tenant isolation?
--
-- Run against the live DB. Changes nothing. The migration files cannot
-- answer this on their own: phase1_tenants.sql / phase2_rls_rollout.sql
-- enumerate `pg_tables` AT RUN TIME, so every gw_* table created after
-- those scripts ran had to add tenant_id itself — and several did not.
-- Some tables (gw_tenants, gw_courses, view gw_profiles_directory) were
-- also applied out-of-band and appear in no migration at all.
--
--   psql "$DATABASE_URL" -f scripts/audit-tenant-isolation.sql

\echo ''
\echo '=== 1. gw_* tables with NO tenant_id column (excluding known globals) ==='
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'gw\_%'
  AND t.tablename NOT IN (
    'gw_tenants','gw_tenant_members','gw_feature_flags','gw_app_functions',
    'gw_permissions','gw_roles','gw_tax_regions','gw_webhook_events'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  )
ORDER BY t.tablename;

\echo ''
\echo '=== 2. gw_* tables WITH tenant_id but NO restrictive isolation policy ==='
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'gw\_%'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
      AND p.permissive = 'RESTRICTIVE'
  )
ORDER BY t.tablename;

\echo ''
\echo '=== 3. Tables with RLS disabled entirely ==='
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'gw\_%'
  AND c.relrowsecurity = false
ORDER BY c.relname;

\echo ''
\echo '=== 4. Wide-open policies: USING (true) with no restrictive twin ==='
SELECT p.tablename, p.policyname, p.cmd, p.roles::text
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.permissive = 'PERMISSIVE'
  AND COALESCE(p.qual, '') IN ('true', '(true)')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies r
    WHERE r.schemaname = 'public'
      AND r.tablename = p.tablename
      AND r.permissive = 'RESTRICTIVE'
  )
ORDER BY p.tablename, p.policyname;

\echo ''
\echo '=== 5. Policies calling the UNSCOPED is_admin()/is_super_admin() on'
\echo '===    a table that has no restrictive twin (global admin = cross-tenant) ==='
SELECT p.tablename, p.policyname, p.cmd
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (COALESCE(p.qual,'') ~ 'is_admin\(|is_super_admin\('
       OR COALESCE(p.with_check,'') ~ 'is_admin\(|is_super_admin\(')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies r
    WHERE r.schemaname = 'public'
      AND r.tablename = p.tablename
      AND r.permissive = 'RESTRICTIVE'
  )
ORDER BY p.tablename, p.policyname;

\echo ''
\echo '=== 6. Restrictive policies covering only `authenticated` (anon bypass) ==='
SELECT p.tablename, p.policyname, p.roles::text
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.permissive = 'RESTRICTIVE'
  AND p.tablename LIKE 'gw\_%'
  AND NOT (p.roles::text ILIKE '%anon%')
  AND EXISTS (
    SELECT 1 FROM pg_policies a
    WHERE a.schemaname = 'public'
      AND a.tablename = p.tablename
      AND a.permissive = 'PERMISSIVE'
      AND (a.roles::text ILIKE '%anon%' OR a.roles::text ILIKE '%public%')
  )
ORDER BY p.tablename;
