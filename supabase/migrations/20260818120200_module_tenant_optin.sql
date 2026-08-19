-- Per-tenant module entitlement, for modules that are not for everybody.
--
-- Background: 20260806140000_features_by_tier_not_addons.sql deliberately made
-- v_tenant_active_modules universal — it returns every active module to every
-- tenant — because gating on gw_tenant_subscriptions had locked all 19 add-on
-- features away from tenants whose plan already included them. That decision
-- stands and this migration does not touch it.
--
-- The gap it leaves: a module that is genuinely not for everybody has no way
-- to say so. Auctions tracks used medical and diagnostic equipment sales; on
-- a platform of choirs, churches, and schools it is relevant to a handful of
-- tenants and noise for the rest.
--
-- So: an OPT-IN flag that defaults to off. A module with requires_opt_in =
-- false behaves exactly as it does today — universal, no subscription needed.
-- Only a module that opts in is filtered, and then only to tenants with a row
-- in gw_tenant_module_optins. Every existing module keeps the default, so
-- nothing about today's behaviour changes for any of them.
--
-- This is entitlement, not billing. gw_tenant_subscriptions stays the
-- Stripe-written billing table; this table is a platform-staff switch and is
-- deliberately separate so re-engaging billing later does not collide with it.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
--   ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
--     -d postgres -v ON_ERROR_STOP=1" < this-file.sql
--
-- Do NOT add --single-transaction; this file opens its own BEGIN/COMMIT.

BEGIN;

ALTER TABLE public.gw_billing_modules
  ADD COLUMN IF NOT EXISTS requires_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gw_billing_modules.requires_opt_in IS
  'When true, this module reaches only tenants with a gw_tenant_module_optins row. '
  'Default false keeps a module universal, which is the free-period norm.';

CREATE TABLE IF NOT EXISTS public.gw_tenant_module_optins (
  tenant_id  uuid NOT NULL REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  module_id  text NOT NULL REFERENCES public.gw_billing_modules(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT true,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS gw_tenant_module_optins_module_idx
  ON public.gw_tenant_module_optins (module_id) WHERE enabled;

DROP TRIGGER IF EXISTS trg_gw_tenant_module_optins_updated_at ON public.gw_tenant_module_optins;
CREATE TRIGGER trg_gw_tenant_module_optins_updated_at
  BEFORE UPDATE ON public.gw_tenant_module_optins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Readable by members of the tenant it concerns (the nav needs to know), and
-- writable only by platform staff: deciding which tenants get a specialised
-- module is a platform call, not a tenant-admin one.
ALTER TABLE public.gw_tenant_module_optins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_tenant_module_optins_read ON public.gw_tenant_module_optins;
CREATE POLICY gw_tenant_module_optins_read ON public.gw_tenant_module_optins
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_owner());

DROP POLICY IF EXISTS gw_tenant_module_optins_staff_write ON public.gw_tenant_module_optins;
CREATE POLICY gw_tenant_module_optins_staff_write ON public.gw_tenant_module_optins
  FOR ALL TO authenticated
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

REVOKE ALL ON public.gw_tenant_module_optins FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gw_tenant_module_optins TO authenticated;

-- The view. Column list, order, and types are unchanged — only the WHERE
-- clause grows a second condition, which is a no-op for every module that has
-- not opted in.
CREATE OR REPLACE VIEW public.v_tenant_active_modules AS
  SELECT m.id AS module_id,
         m.name AS module_name,
         m.description,
         m.tier,
         m.category,
         m.icon,
         m.sort_order,
         COALESCE(s.status, CASE WHEN m.tier = 'starter' THEN 'starter' ELSE 'included' END) AS status,
         s.current_period_end,
         s.trial_ends_at
    FROM public.gw_billing_modules m
    LEFT JOIN public.gw_tenant_subscriptions s
      ON s.module_id = m.id AND s.tenant_id = public.current_tenant_id()
   WHERE m.is_active
     AND (
       NOT m.requires_opt_in
       OR EXISTS (
         SELECT 1 FROM public.gw_tenant_module_optins o
          WHERE o.module_id = m.id
            AND o.tenant_id = public.current_tenant_id()
            AND o.enabled
       )
     )
   ORDER BY m.sort_order;

-- Auctions is the first opt-in module.
UPDATE public.gw_billing_modules SET requires_opt_in = true WHERE id = 'auctions';

-- Turn it on for Lyke House, the tenant it was built for.
INSERT INTO public.gw_tenant_module_optins (tenant_id, module_id, note)
SELECT t.id, 'auctions', 'Built for Lyke House; enabled at launch.'
  FROM public.gw_tenants t
 WHERE t.slug = 'lykehouse'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
