-- Workspace Settings — fill in the missing pieces the UI expects.
--
-- 1. gw_tenant_addons — per-tenant activation ledger for billable
--    add-ons (gw_billing_modules). The Workspace Settings page assumes
--    this table existed but it never did, so the "Active" badge and
--    "Your subscription" list silently returned zero rows.
-- 2. Extend gw_branding_settings with the General-tab fields the UI
--    promised but never delivered (timezone, locale, contact_email).

-- ── Tenant add-on activations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gw_tenant_addons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES gw_tenants(id) ON DELETE CASCADE,
  module_id       text NOT NULL REFERENCES gw_billing_modules(id) ON DELETE RESTRICT,
  is_active       boolean NOT NULL DEFAULT true,
  -- Stripe linkage — written by stripe-webhook on subscription events.
  stripe_subscription_id text,
  stripe_customer_id     text,
  activated_at    timestamptz NOT NULL DEFAULT now(),
  cancelled_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS gw_tenant_addons_tenant_idx ON gw_tenant_addons (tenant_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS gw_tenant_addons_module_idx ON gw_tenant_addons (module_id) WHERE is_active;

ALTER TABLE gw_tenant_addons ENABLE ROW LEVEL SECURITY;

-- Members of the tenant can read their own activations (for the
-- subscription view in Workspace Settings).
CREATE POLICY gw_tenant_addons_tenant_read ON gw_tenant_addons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.tenant_id = gw_tenant_addons.tenant_id)
  ));

-- Only tenant admins (or super-admins) can mutate. Stripe webhook
-- bypasses RLS via service-role and writes directly.
CREATE POLICY gw_tenant_addons_admin_write ON gw_tenant_addons FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.tenant_id = gw_tenant_addons.tenant_id
      AND (p.is_admin = true OR p.is_super_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.tenant_id = gw_tenant_addons.tenant_id
      AND (p.is_admin = true OR p.is_super_admin = true)
  ));

-- Convenience: view used by the workspace settings page so it doesn't
-- have to join + filter in client code.
CREATE OR REPLACE VIEW gw_tenant_active_addons AS
SELECT
  ta.tenant_id,
  ta.module_id,
  ta.activated_at,
  bm.name,
  bm.description,
  bm.monthly_price_cents,
  bm.category,
  bm.icon
FROM gw_tenant_addons ta
JOIN gw_billing_modules bm ON bm.id = ta.module_id
WHERE ta.is_active = true;

-- ── General workspace settings columns ──────────────────────────────
ALTER TABLE gw_branding_settings
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS week_start text DEFAULT 'sunday'
    CHECK (week_start IN ('sunday', 'monday'));
