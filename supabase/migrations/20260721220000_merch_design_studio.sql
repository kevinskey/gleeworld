-- Merch design studio + S&S catalog cache + storefront publish flow.
-- Introduces per-tenant tables for blanks, designs, campaigns, and published
-- storefront items, plus the publish RPC that snapshots costs at publish time.

BEGIN;

-- ── gw_merch_products ────────────────────────────────────────────────────
-- Cache of S&S Activewear blanks the tenant can design on. Populated by the
-- ss-catalog-sync edge function; kept tenant-scoped in case an operator
-- wants to hide certain blanks per tenant.
CREATE TABLE IF NOT EXISTS public.gw_merch_products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id(),
  tb_product_id  text NOT NULL,
  name           text NOT NULL,
  category       text NOT NULL DEFAULT 'apparel',
  base_cost      numeric(10,2) NOT NULL DEFAULT 0,
  variants       jsonb NOT NULL DEFAULT '{"sizes":[],"colors":[]}'::jsonb,
  print_areas    jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_image    text,
  is_active      boolean NOT NULL DEFAULT true,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tb_product_id)
);

CREATE INDEX IF NOT EXISTS gw_merch_products_tenant_active_idx
  ON public.gw_merch_products (tenant_id, is_active);

-- ── gw_merch_campaigns ───────────────────────────────────────────────────
-- Fundraising campaigns to which storefront items can be attached.
CREATE TABLE IF NOT EXISTS public.gw_merch_campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id(),
  name         text NOT NULL,
  slug         text NOT NULL,
  goal_amount  numeric(10,2),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- ── gw_merch_designs ─────────────────────────────────────────────────────
-- Design JSON authored in MerchDesignStudio. Not directly purchasable —
-- must be published (below) to become a storefront item.
CREATE TABLE IF NOT EXISTS public.gw_merch_designs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id(),
  name           text NOT NULL,
  tb_product_id  text NOT NULL,
  design_json    jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','approved','published','archived')),
  thumbnail_ref  text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_merch_designs_tenant_updated_idx
  ON public.gw_merch_designs (tenant_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public._touch_merch_design() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS gw_merch_designs_touch ON public.gw_merch_designs;
CREATE TRIGGER gw_merch_designs_touch
BEFORE UPDATE ON public.gw_merch_designs
FOR EACH ROW EXECUTE FUNCTION public._touch_merch_design();

-- ── gw_merch_storefront_items ────────────────────────────────────────────
-- Snapshot of a published design: freezes base cost + platform fee at
-- publish time so buyer-facing pricing can't drift silently.
CREATE TABLE IF NOT EXISTS public.gw_merch_storefront_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL DEFAULT public.current_tenant_id(),
  design_id             uuid NOT NULL REFERENCES public.gw_merch_designs(id) ON DELETE RESTRICT,
  campaign_id           uuid REFERENCES public.gw_merch_campaigns(id) ON DELETE SET NULL,
  title                 text NOT NULL,
  slug                  text NOT NULL,
  description           text,
  cover_image           text,
  retail_price          numeric(10,2) NOT NULL,
  base_cost_snapshot    numeric(10,2) NOT NULL,
  platform_fee_snapshot numeric(10,2) NOT NULL,
  variants              jsonb NOT NULL DEFAULT '{}'::jsonb,
  opens_at              timestamptz,
  closes_at             timestamptz,
  is_active             boolean NOT NULL DEFAULT true,
  published_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS gw_merch_storefront_items_active_idx
  ON public.gw_merch_storefront_items (tenant_id, is_active, published_at DESC);

-- ── gw_store_settings ────────────────────────────────────────────────────
-- Single-row per-tenant knobs. Platform fee lives here so it can be tuned
-- without a code change. `id = 1` is a legacy convention from the port.
CREATE TABLE IF NOT EXISTS public.gw_store_settings (
  id                              int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tenant_id                       uuid NOT NULL DEFAULT public.current_tenant_id(),
  merch_platform_fee_pct          numeric(5,2) NOT NULL DEFAULT 0,
  merch_platform_fee_flat_cents   int NOT NULL DEFAULT 0,
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

-- If the table pre-exists from another feature, additively add the fee
-- columns without erroring.
ALTER TABLE public.gw_store_settings
  ADD COLUMN IF NOT EXISTS merch_platform_fee_pct        numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merch_platform_fee_flat_cents int NOT NULL DEFAULT 0;

-- ── publish_merch_storefront_item RPC ────────────────────────────────────
-- Runs SECURITY DEFINER so admins publish through a single validated path
-- (snapshots base_cost + fee, marks design as published).
CREATE OR REPLACE FUNCTION public.publish_merch_storefront_item(
  _design_id     uuid,
  _title         text,
  _slug          text,
  _retail_price  numeric,
  _variants      jsonb,
  _description   text DEFAULT NULL,
  _cover_image   text DEFAULT NULL,
  _campaign_id   uuid DEFAULT NULL,
  _opens_at      timestamptz DEFAULT NULL,
  _closes_at     timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _design      public.gw_merch_designs;
  _blank       public.gw_merch_products;
  _settings    public.gw_store_settings;
  _fee_snap    numeric(10,2);
  _base_cost   numeric(10,2);
  _item_id     uuid;
BEGIN
  SELECT * INTO _design FROM public.gw_merch_designs WHERE id = _design_id;
  IF _design.id IS NULL THEN
    RAISE EXCEPTION 'Design % not found', _design_id;
  END IF;

  SELECT * INTO _blank
    FROM public.gw_merch_products
   WHERE tb_product_id = _design.tb_product_id
     AND tenant_id     = _design.tenant_id
     AND is_active     = true;
  IF _blank.id IS NULL THEN
    RAISE EXCEPTION 'Active blank % not found for tenant', _design.tb_product_id;
  END IF;

  SELECT * INTO _settings FROM public.gw_store_settings WHERE id = 1;
  _base_cost := COALESCE(_blank.base_cost, 0);
  _fee_snap  := ROUND(
    _retail_price * COALESCE(_settings.merch_platform_fee_pct, 0) / 100
    + COALESCE(_settings.merch_platform_fee_flat_cents, 0) / 100.0,
    2
  );

  IF _retail_price < _base_cost + _fee_snap THEN
    RAISE EXCEPTION 'Retail price % must be >= base cost + platform fee %', _retail_price, _base_cost + _fee_snap;
  END IF;

  INSERT INTO public.gw_merch_storefront_items (
    tenant_id, design_id, campaign_id,
    title, slug, description, cover_image,
    retail_price, base_cost_snapshot, platform_fee_snapshot,
    variants, opens_at, closes_at
  ) VALUES (
    _design.tenant_id, _design.id, _campaign_id,
    _title, _slug, _description, _cover_image,
    _retail_price, _base_cost, _fee_snap,
    _variants, _opens_at, _closes_at
  )
  RETURNING id INTO _item_id;

  UPDATE public.gw_merch_designs SET status = 'published' WHERE id = _design.id;

  RETURN _item_id;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Tenant isolation: rows are visible only when tenant_id matches the
-- session's current tenant, resolved by public.current_tenant_id().
ALTER TABLE public.gw_merch_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_merch_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_merch_designs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_merch_storefront_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_store_settings         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_read  ON public.gw_merch_products;
DROP POLICY IF EXISTS tenant_isolation_write ON public.gw_merch_products;
CREATE POLICY tenant_isolation_read  ON public.gw_merch_products
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_write ON public.gw_merch_products
  FOR ALL    USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_read  ON public.gw_merch_campaigns;
DROP POLICY IF EXISTS tenant_isolation_write ON public.gw_merch_campaigns;
CREATE POLICY tenant_isolation_read  ON public.gw_merch_campaigns
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_write ON public.gw_merch_campaigns
  FOR ALL    USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_read  ON public.gw_merch_designs;
DROP POLICY IF EXISTS tenant_isolation_write ON public.gw_merch_designs;
CREATE POLICY tenant_isolation_read  ON public.gw_merch_designs
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_write ON public.gw_merch_designs
  FOR ALL    USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_read  ON public.gw_merch_storefront_items;
DROP POLICY IF EXISTS tenant_isolation_write ON public.gw_merch_storefront_items;
CREATE POLICY tenant_isolation_read  ON public.gw_merch_storefront_items
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_write ON public.gw_merch_storefront_items
  FOR ALL    USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_read  ON public.gw_store_settings;
DROP POLICY IF EXISTS tenant_isolation_write ON public.gw_store_settings;
CREATE POLICY tenant_isolation_read  ON public.gw_store_settings
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_write ON public.gw_store_settings
  FOR ALL    USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

GRANT SELECT ON public.gw_merch_products, public.gw_merch_campaigns,
                public.gw_merch_designs, public.gw_merch_storefront_items,
                public.gw_store_settings
  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gw_merch_designs, public.gw_merch_campaigns,
                                public.gw_merch_storefront_items, public.gw_store_settings
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_merch_storefront_item TO authenticated;

COMMIT;
