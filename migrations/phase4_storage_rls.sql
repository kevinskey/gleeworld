-- Phase 4: Storage RLS by tenant_id
-- Adds tenant_id to storage.objects + storage.buckets, backfills existing
-- rows to spelman, layers a RESTRICTIVE policy that scopes authenticated
-- access by tenant. Public buckets remain readable by anon (no change).

BEGIN;

-- 1. tenant_id columns on storage tables
ALTER TABLE storage.objects
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
ALTER TABLE storage.buckets
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);

CREATE INDEX IF NOT EXISTS idx_storage_objects_tenant ON storage.objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_buckets_tenant ON storage.buckets(tenant_id);

-- 2. Backfill existing rows to spelman
DO $$
DECLARE
  spelman_id uuid;
BEGIN
  SELECT id INTO spelman_id FROM public.gw_tenants WHERE slug = 'spelman';
  UPDATE storage.objects SET tenant_id = spelman_id WHERE tenant_id IS NULL;
  UPDATE storage.buckets SET tenant_id = spelman_id WHERE tenant_id IS NULL;
END $$;

-- 3. Trigger to auto-fill tenant_id from JWT claim on INSERT
CREATE OR REPLACE FUNCTION storage.set_tenant_id_on_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tenant_id_objects ON storage.objects;
CREATE TRIGGER trg_set_tenant_id_objects
  BEFORE INSERT ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION storage.set_tenant_id_on_insert();

-- 4. RESTRICTIVE policy: authenticated users only see their tenant's objects.
-- Permissive `anon_read_public` (anon role) is unaffected — anon never
-- carries a tenant claim, so authenticated-only restrictive doesn't apply.
-- service_role bypasses RLS.
DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.objects;
CREATE POLICY tenant_isolation_restrict ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.buckets;
CREATE POLICY tenant_isolation_restrict ON storage.buckets
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- platform-shared buckets (tenant_id NULL) visible to all authenticated;
    -- tenant-owned buckets only to that tenant
    tenant_id IS NULL OR tenant_id = public.current_tenant_id()
  )
  WITH CHECK (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

COMMIT;

-- =======================================
-- Verification
-- =======================================
\echo ''
\echo '=== storage.objects by tenant ==='
SELECT t.slug, COUNT(o.id) AS files, pg_size_pretty(SUM((o.metadata->>'size')::bigint)) AS total
FROM storage.objects o
LEFT JOIN public.gw_tenants t ON t.id = o.tenant_id
GROUP BY t.slug
ORDER BY COUNT(o.id) DESC;

\echo ''
\echo '=== storage.buckets by tenant ==='
SELECT t.slug, COUNT(b.id) AS buckets
FROM storage.buckets b
LEFT JOIN public.gw_tenants t ON t.id = b.tenant_id
GROUP BY t.slug;

\echo ''
\echo '=== Smoke test: Spelman user sees all 2186 objects ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('tenant_id', (SELECT id::text FROM public.gw_tenants WHERE slug='spelman'),
                    'role', 'authenticated',
                    'sub', '00000000-0000-0000-0000-000000000000')::text, true);
SELECT current_user, COUNT(*) AS visible FROM storage.objects;
ROLLBACK;

\echo ''
\echo '=== Smoke test: user with no tenant claim sees zero ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}';
SELECT current_user, COUNT(*) AS visible FROM storage.objects;
ROLLBACK;
