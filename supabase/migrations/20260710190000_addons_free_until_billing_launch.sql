-- Add-on billing is NOT engaged yet: every add-on activates free, with
-- no Stripe checkout, until the platform formally launches add-on
-- pricing. The workspace Modules UI routes any add-on with a non-null
-- monthly_price_cents through create-module-checkout (Stripe); rows
-- with a NULL price use the direct gw_tenant_subscriptions toggle.
--
-- Songwriting (20260710120000) was the only add-on seeded with a price
-- (1499) — and once its stripe_price_id was wired it started sending
-- tenants to Stripe checkout. Clear the price on ALL addon-tier rows so
-- the whole catalog is uniformly free-for-now, including any row priced
-- directly in prod. stripe_price_id is deliberately KEPT: the UI gates
-- only on monthly_price_cents, and keeping the id means re-engaging
-- billing later is just restoring the price column.
--
-- List prices to restore at billing launch: songwriting = 1499.

UPDATE public.gw_billing_modules
SET monthly_price_cents = NULL
WHERE tier = 'addon'
  AND monthly_price_cents IS NOT NULL;
