-- Register the tenant Store add-on in the billing catalog so it's
-- provisionable (via create-module-checkout, module_id='store') and
-- appears in the Modules page (gw_billing_modules -> v_tenant_active_modules).
--
-- Mirrors 20260620140000_box_office_schema.sql's box_office row: 'addon'
-- tier, 'revenue' category (same bucket as Box Office — both are
-- tenant-run commerce on the tenant's own Stripe Connect account).
-- stripe_price_id stays NULL until platform-side pricing is decided;
-- create-module-checkout already refuses to charge with a null price id,
-- so this row can ship dark and be flipped on later.
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, is_active, sort_order)
VALUES (
  'store',
  'Store',
  'Sell merchandise and digital products from your own storefront. Runs on your own Stripe account — order payments go directly to you.',
  'addon',
  'revenue',
  'Store',
  true,
  210
)
ON CONFLICT (id) DO NOTHING;
