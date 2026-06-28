-- Reconcile: the canonical tenant↔module activation table has always
-- been gw_tenant_subscriptions (stripe-webhook writes here on
-- customer.subscription.* events). The gw_tenant_addons table I added
-- yesterday is a duplicate. Drop it and rebuild the view to point at
-- the real table.

DROP VIEW IF EXISTS gw_tenant_active_addons;
DROP TABLE IF EXISTS gw_tenant_addons;

-- Same shape the Workspace Settings page consumes — just sourced from
-- the canonical subscriptions table.
CREATE OR REPLACE VIEW gw_tenant_active_addons AS
SELECT
  s.tenant_id,
  s.module_id,
  s.enabled_at        AS activated_at,
  s.status,
  s.current_period_end,
  s.stripe_subscription_id,
  bm.name,
  bm.description,
  bm.monthly_price_cents,
  bm.category,
  bm.icon
FROM gw_tenant_subscriptions s
JOIN gw_billing_modules bm ON bm.id = s.module_id
WHERE s.status IN ('active', 'trial');
