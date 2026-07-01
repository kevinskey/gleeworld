-- Multi-tenant scoping for gw_drum_zone_config.
--
-- The Music Tools Drums card lets tenant admins drag drum hit-zones
-- on the photo of a kit and publish the layout for their students.
-- The publish path currently upserts to id='global', so a Kevin's
-- World admin's edits overwrite the layout for every tenant on the
-- platform — leaking one tenant's UI into everyone else's.
--
-- Fix: add tenant_id, backfill the existing 'global' row to the main
-- tenant, and change the primary key to (id, tenant_id) so each
-- tenant now has its own 'global' row. RLS restrictive isolation
-- ensures each tenant only ever sees / writes their own copy.
--
-- Client (src/components/audioTools/DrumsPlayer.tsx) doesn't need to
-- change: its .eq('id', 'global') query still works because RLS
-- silently scopes the maybeSingle() to the current tenant, and the
-- BEFORE INSERT trigger fills tenant_id from the JWT.

-- ── Add tenant_id ────────────────────────────────────────────────────

ALTER TABLE public.gw_drum_zone_config
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill the existing single 'global' row to the main tenant so it
-- keeps showing up for the platform site.
UPDATE public.gw_drum_zone_config
   SET tenant_id = (SELECT id FROM public.gw_tenants WHERE slug = 'main')
 WHERE tenant_id IS NULL;

ALTER TABLE public.gw_drum_zone_config
  ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();

ALTER TABLE public.gw_drum_zone_config
  ALTER COLUMN tenant_id SET NOT NULL;

-- ── Composite primary key so each tenant can hold its own 'global' ──
--
-- Postgres won't drop the existing PK without knowing its name — it
-- was auto-generated when the table was created, so look it up.

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

ALTER TABLE public.gw_drum_zone_config
  ADD PRIMARY KEY (tenant_id, id);

-- ── BEFORE INSERT trigger to fill tenant_id from JWT ────────────────

CREATE OR REPLACE FUNCTION gw_drum_zone_config_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_drum_zone_config_fill_tenant_trg ON public.gw_drum_zone_config;
CREATE TRIGGER gw_drum_zone_config_fill_tenant_trg
  BEFORE INSERT ON public.gw_drum_zone_config
  FOR EACH ROW EXECUTE FUNCTION gw_drum_zone_config_fill_tenant();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.gw_drum_zone_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_drum_zone_config;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_drum_zone_config
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Anyone in the tenant can read the current zones; only admins in the
-- tenant may write. Keep this permissive so it composes with the
-- restrictive tenant check above.

DROP POLICY IF EXISTS drum_zones_read ON public.gw_drum_zone_config;
CREATE POLICY drum_zones_read
  ON public.gw_drum_zone_config
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS drum_zones_admin_write ON public.gw_drum_zone_config;
CREATE POLICY drum_zones_admin_write
  ON public.gw_drum_zone_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin)
    )
  );
