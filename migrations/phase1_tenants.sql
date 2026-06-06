-- Phase 1: Multi-tenant foundation (NON-DESTRUCTIVE)
-- Creates gw_tenants + gw_tenant_members, adds nullable tenant_id to every
-- tenant-scoped gw_* table, backfills existing rows to the 'spelman' tenant.
-- Dry-run target: self-hosted main DB on 198.211.113.144.

BEGIN;

-- 1. Tenants registry
CREATE TABLE IF NOT EXISTS public.gw_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active',
  subdomain text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed first real tenant from existing data
INSERT INTO public.gw_tenants (slug, name, subdomain)
VALUES ('spelman', 'Spelman College Glee Club', 'gleeworld.org')
ON CONFLICT (slug) DO NOTHING;

-- 3. User ↔ Tenant membership (users can belong to multiple tenants)
CREATE TABLE IF NOT EXISTS public.gw_tenant_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_gw_tenant_members_tenant ON public.gw_tenant_members(tenant_id);

-- 4. Helper function: read tenant_id from JWT claim
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'tenant_id',
    ''
  )::uuid
$$;

-- 5. Backfill: every existing auth.users → spelman tenant
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id,
       CASE WHEN u.is_super_admin THEN 'super_admin' ELSE 'member' END
FROM auth.users u
CROSS JOIN public.gw_tenants t
WHERE t.slug = 'spelman'
ON CONFLICT DO NOTHING;

-- 6. Add tenant_id column to every tenant-scoped gw_* table.
-- Global tables (NOT tenant-scoped) are excluded via whitelist.
DO $$
DECLARE
  tbl text;
  spelman_id uuid;
  global_tables text[] := ARRAY[
    'gw_tenants', 'gw_tenant_members',
    'gw_feature_flags', 'gw_app_functions',
    'gw_permissions', 'gw_roles', 'gw_tax_regions',
    'gw_webhook_events'
  ];
BEGIN
  SELECT id INTO spelman_id FROM public.gw_tenants WHERE slug = 'spelman';

  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'gw_%'
      AND NOT (tablename = ANY(global_tables))
    ORDER BY tablename
  LOOP
    -- Add column if missing
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id)',
      tbl
    );
    -- Backfill existing rows
    EXECUTE format(
      'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL',
      tbl, spelman_id
    );
    -- Index for query performance + future RLS
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)',
      'idx_' || tbl || '_tenant_id', tbl
    );
  END LOOP;
END $$;

COMMIT;

-- Verification queries (run separately, not in transaction)
\echo '---'
\echo 'Tenants:'
SELECT id, slug, name FROM public.gw_tenants;
\echo '---'
\echo 'Tenant member count:'
SELECT COUNT(*) FROM public.gw_tenant_members;
\echo '---'
\echo 'Tables WITHOUT tenant_id (should be only global whitelist + non-gw):'
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'gw_%'
  AND tablename NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenant_id'
  )
ORDER BY tablename;
