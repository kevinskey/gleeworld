-- Link gw_tenants → tshirtbrothers.com group store.
--
-- Each GleeWorld tenant can (optionally) have a TSB group store used
-- for fundraising apparel. The link is discovered lazily: when a tenant
-- admin clicks "Enable Fundraising Store" in Workspace Settings, the
-- provision-tsb-store edge function calls TSB, gets back the slug +
-- subdomain, and writes them here.
--
-- tsb_store_slug is the definitive linkage — it doubles as the value
-- TSB stores in stores.gleeworld_tenant_slug, so it MUST equal the
-- GleeWorld tenant slug. tsb_store_subdomain is the optional pretty
-- host (e.g. "sandycreekpto" → sandycreekpto.tshirtbrothers.com);
-- NULL means the store is only reachable via tshirtbrothers.com/stores/<slug>.
--
-- No secret is stored per-tenant: authentication uses the shared
-- GLEEWORLD_SERVICE_KEY that lives in the edge-function env, not a
-- per-store API key. That's a deliberate simplification — the
-- provisioning surface is small enough that key-rotation via env
-- redeploy is fine.

ALTER TABLE public.gw_tenants
  ADD COLUMN IF NOT EXISTS tsb_store_slug      VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tsb_store_subdomain VARCHAR(80);

CREATE INDEX IF NOT EXISTS gw_tenants_tsb_store_slug_idx
  ON public.gw_tenants (tsb_store_slug)
  WHERE tsb_store_slug IS NOT NULL;
