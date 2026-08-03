-- gw_store_settings was a singleton (id INTEGER PRIMARY KEY DEFAULT 1
-- CHECK (id = 1)) with a service-role-only RLS policy. Two problems:
--
--   1. Browser-side StoreSettingsManager / FeaturedProductsSettings write
--      to it via the authenticated Supabase client. With only a
--      service_role policy, RLS rejects the write and .upsert() errors —
--      so the store-settings page has been broken for browser users.
--   2. Even if the RLS were opened up, the singleton row is shared across
--      all tenants — the same class of trap as gw_branding_settings that
--      broke Branding + General saves for 49 tenants until 2026-07-18.
--
-- Fix: add tenant_id (DEFAULT current_tenant_id() + BEFORE INSERT trigger)
-- per the standard multi-tenant pattern; move the PK to tenant_id; add
-- restrictive tenant isolation + a permissive admin write policy that
-- accepts both role spellings (super_admin canonical + legacy super-admin).
--
-- Backfill: the single legacy row (id = 1) is assigned to the 'main'
-- tenant. Every other tenant starts empty; their store manager will INSERT
-- its first row on first save, with tenant_id stamped by the trigger.

-- 1. Add tenant_id column (nullable for backfill window).
ALTER TABLE public.gw_store_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.gw_tenants(id) ON DELETE CASCADE;

-- 2. Backfill the singleton row to the main tenant.
UPDATE public.gw_store_settings s
SET tenant_id = t.id
FROM public.gw_tenants t
WHERE s.tenant_id IS NULL AND t.slug = 'main';

-- 3. Drop any row we couldn't attribute (should be zero).
DELETE FROM public.gw_store_settings WHERE tenant_id IS NULL;

-- 4. Enforce NOT NULL + DEFAULT from JWT.
ALTER TABLE public.gw_store_settings
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();

-- 5. Drop the singleton PK + CHECK, promote tenant_id to PK.
ALTER TABLE public.gw_store_settings
  DROP CONSTRAINT IF EXISTS gw_store_settings_id_check;
ALTER TABLE public.gw_store_settings
  DROP CONSTRAINT IF EXISTS gw_store_settings_pkey;
ALTER TABLE public.gw_store_settings
  ALTER COLUMN id DROP NOT NULL,
  ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.gw_store_settings
  ADD CONSTRAINT gw_store_settings_pkey PRIMARY KEY (tenant_id);

CREATE INDEX IF NOT EXISTS idx_gw_store_settings_tenant_id
  ON public.gw_store_settings(tenant_id);

-- 6. Replace the service-role-only policy with proper tenant isolation
--    plus role-gated writes. Drop both historical policy names.
DROP POLICY IF EXISTS service_role_only ON public.gw_store_settings;
DROP POLICY IF EXISTS "Service role full access on gw_store_settings" ON public.gw_store_settings;
DROP POLICY IF EXISTS gw_store_settings_tenant_iso ON public.gw_store_settings;
DROP POLICY IF EXISTS gw_store_settings_public_read ON public.gw_store_settings;
DROP POLICY IF EXISTS gw_store_settings_admin_write ON public.gw_store_settings;

-- Hard tenant boundary — every path (SELECT, INSERT, UPDATE, DELETE) must
-- pass this restrictive filter, so no other permissive policy can leak
-- rows across tenants.
CREATE POLICY gw_store_settings_tenant_iso
  ON public.gw_store_settings AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Public storefront (anon key) needs to read store settings — display
-- name, currency, featured layout, etc. Tenant scoping handled by the
-- restrictive policy above.
CREATE POLICY gw_store_settings_public_read
  ON public.gw_store_settings FOR SELECT TO authenticated, anon
  USING (true);

-- Tenant admins can create their first row.
CREATE POLICY gw_store_settings_admin_insert
  ON public.gw_store_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super_admin', 'super-admin', 'admin']))
    )
  );

-- Tenant admins can UPDATE their tenant's row (upsert lands here on
-- second save).
CREATE POLICY gw_store_settings_admin_update
  ON public.gw_store_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super_admin', 'super-admin', 'admin']))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super_admin', 'super-admin', 'admin']))
    )
  );

-- Default PostgREST grants (idempotent).
GRANT SELECT ON public.gw_store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.gw_store_settings TO authenticated;

-- 7. BEFORE INSERT trigger fills tenant_id from JWT when the client
--    omits it (documented pattern to avoid silent write failures).
DROP TRIGGER IF EXISTS set_tenant_id_default ON public.gw_store_settings;
CREATE TRIGGER set_tenant_id_default
  BEFORE INSERT ON public.gw_store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

NOTIFY pgrst, 'reload schema';
