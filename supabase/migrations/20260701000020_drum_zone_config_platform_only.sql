-- Revert drum-zone-config to a single platform-wide row.
--
-- The earlier tenant-scoping migration (20260701000000) gave each
-- tenant their own drum-zone config so a Kevin's World admin couldn't
-- overwrite the platform layout. On reflection: drum-zone geometry
-- maps to the SHIPPED drum photos, which are platform assets — not
-- something tenant admins should touch at all. Correct model is one
-- global row edited only by the platform owner (super-admin on the
-- main tenant).
--
-- This migration:
--   • Drops the composite PK and tenant_id column.
--   • Removes the RESTRICTIVE tenant isolation policy.
--   • Rewrites the write policy to require is_super_admin AND
--     membership in the main tenant (i.e. platform super-admins
--     only — tenant super-admins on demo/kevin/etc. cannot write).
--   • Read stays open so every tenant renders the same layout.

-- ── Collapse to a single 'global' row ───────────────────────────────
--
-- Only the main-tenant row survives; any per-tenant clones (none exist
-- yet, but be defensive) are discarded.

DELETE FROM public.gw_drum_zone_config
 WHERE tenant_id IS DISTINCT FROM (SELECT id FROM public.gw_tenants WHERE slug = 'main');

-- ── Drop composite PK + tenant_id ────────────────────────────────────

DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname INTO pk_name
    FROM pg_constraint
   WHERE conrelid = 'public.gw_drum_zone_config'::regclass
     AND contype = 'p';
  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.gw_drum_zone_config DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

DROP TRIGGER IF EXISTS gw_drum_zone_config_fill_tenant_trg ON public.gw_drum_zone_config;
DROP FUNCTION IF EXISTS gw_drum_zone_config_fill_tenant();

ALTER TABLE public.gw_drum_zone_config
  DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE public.gw_drum_zone_config
  ADD PRIMARY KEY (id);

-- ── RLS: platform-only writes, open reads ────────────────────────────

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_drum_zone_config;
DROP POLICY IF EXISTS drum_zones_read ON public.gw_drum_zone_config;
DROP POLICY IF EXISTS drum_zones_admin_write ON public.gw_drum_zone_config;
DROP POLICY IF EXISTS drum_zones_anon_read ON public.gw_drum_zone_config;

-- Anyone (including anonymous visitors) can read the layout so drums
-- render correctly on public tenant sites.
CREATE POLICY drum_zones_read
  ON public.gw_drum_zone_config
  FOR SELECT
  USING (true);

-- Only platform super-admins may write. A tenant super-admin on
-- demo/kevin/etc. does NOT qualify — they lack membership in the main
-- tenant.
CREATE POLICY drum_zones_platform_write
  ON public.gw_drum_zone_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND p.is_super_admin = true
         AND p.tenant_id = (SELECT id FROM public.gw_tenants WHERE slug = 'main')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND p.is_super_admin = true
         AND p.tenant_id = (SELECT id FROM public.gw_tenants WHERE slug = 'main')
    )
  );
