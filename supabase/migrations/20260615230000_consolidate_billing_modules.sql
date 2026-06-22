-- Consolidate the gw_billing_modules catalog.
--
-- - contracts merged into finance (finance is the umbrella addon for
--   contracts + all financial tooling).
-- - alumni_portal merged into alumni (single Alumni addon covers all
--   alumnae features incl. the portal).
-- - appointments removed (covered by Office Hours, now part of Academy).
-- - radio removed (no implementation, not in plan).
-- - sheet_music_annotation removed (annotation is a feature of the
--   Music Library, not its own purchasable addon).
--
-- Subscriptions for the merged/removed modules are migrated or deleted.
-- merch stays as the standalone ecommerce/store addon.

BEGIN;

-- 1. Merge subscription rows: contracts → finance, alumni_portal → alumni.
--    Skip if the target already has an active row for the tenant.
INSERT INTO public.gw_tenant_subscriptions (tenant_id, module_id, status, enabled_at)
SELECT ts.tenant_id, 'finance', 'active', LEAST(ts.enabled_at, now())
  FROM public.gw_tenant_subscriptions ts
 WHERE ts.module_id = 'contracts'
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_tenant_subscriptions x
      WHERE x.tenant_id = ts.tenant_id AND x.module_id = 'finance'
   );

INSERT INTO public.gw_tenant_subscriptions (tenant_id, module_id, status, enabled_at)
SELECT ts.tenant_id, 'alumni', 'active', LEAST(ts.enabled_at, now())
  FROM public.gw_tenant_subscriptions ts
 WHERE ts.module_id = 'alumni_portal'
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_tenant_subscriptions x
      WHERE x.tenant_id = ts.tenant_id AND x.module_id = 'alumni'
   );

-- 2. Drop subscriptions for the now-removed module ids.
DELETE FROM public.gw_tenant_subscriptions
 WHERE module_id IN ('contracts', 'alumni_portal', 'appointments', 'radio', 'sheet_music_annotation');

-- 3. Drop the catalog entries themselves.
DELETE FROM public.gw_billing_modules
 WHERE id IN ('contracts', 'alumni_portal', 'appointments', 'radio', 'sheet_music_annotation');

-- 4. Update descriptions for the umbrella modules so the Modules page
--    accurately reflects what's bundled.
UPDATE public.gw_billing_modules
   SET name = 'Finance',
       description = 'Contracts, invoicing, payment plans, and budget tools for the ensemble.'
 WHERE id = 'finance';

UPDATE public.gw_billing_modules
   SET name = 'Alumni',
       description = 'Alumni directory, portal, engagement campaigns, and graduate communications.'
 WHERE id = 'alumni';

COMMIT;
