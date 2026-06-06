-- Phase 1 extended: tenant_id + RLS on ALL public tables (not just gw_%).
-- Skip global whitelist + system schemas. Idempotent — safe to re-run.

BEGIN;

DO $$
DECLARE
  tbl text;
  spelman_id uuid;
  added int := 0;
  rls_added int := 0;
  global_tables text[] := ARRAY[
    -- Already-known platform globals
    'gw_tenants', 'gw_tenant_members',
    'gw_feature_flags', 'gw_app_functions',
    'gw_permissions', 'gw_roles', 'gw_tax_regions', 'gw_webhook_events',
    -- Legacy globals (platform-level data, not tenant-scoped)
    'app_roles', 'user_roles', 'user_roles_multi',
    'permission_groups', 'permission_group_permissions',
    'user_permission_groups',
    'username_permissions', 'username_module_permissions',
    'theme_templates', 'rate_limits', 'security_rate_limits',
    'notification_sounds', 'usccb_readings'
  ];
BEGIN
  SELECT id INTO spelman_id FROM public.gw_tenants WHERE slug = 'spelman';

  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND NOT (tablename = ANY(global_tables))
      -- Skip if tenant_id already there (idempotent)
    ORDER BY tablename
  LOOP
    -- Add tenant_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='tenant_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.gw_tenants(id)',
        tbl
      );
      added := added + 1;
    END IF;

    -- Backfill NULLs to spelman
    EXECUTE format(
      'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL',
      tbl, spelman_id
    );

    -- Index on tenant_id
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)',
      'idx_' || tbl || '_tenant_id', tbl
    );

    -- Enable RLS + restrictive policy
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_restrict ON public.%I '
      'AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (tenant_id = public.current_tenant_id()) '
      'WITH CHECK (tenant_id = public.current_tenant_id())',
      tbl
    );
    rls_added := rls_added + 1;
  END LOOP;

  RAISE NOTICE 'columns added: %, restrictive policies (re)created: %', added, rls_added;
END $$;

COMMIT;

-- Verify
\echo ''
\echo '=== Coverage ==='
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public') AS total_public_tables,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND column_name='tenant_id') AS tables_with_tenant_id,
  (SELECT COUNT(*) FROM pg_policy WHERE polname='tenant_isolation_restrict') AS tables_with_restrict_policy;

\echo ''
\echo '=== Public tables WITHOUT tenant_id (should be ONLY the globals) ==='
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenant_id'
  )
ORDER BY tablename;
