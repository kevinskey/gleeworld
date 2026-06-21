-- Unified store schema — clean-slate redo of the product tables.
--
-- Background: the codebase carried two parallel product systems —
--   • `gw_products` + `gw_product_variants` + `gw_orders` (order-aware,
--     used by Stripe checkout, square sync, inventory movements)
--   • `products` + `product_categories` + `product_images` +
--     `product_variants` (admin ProductManager + CategoryManager)
-- The two never spoke, so the public Shop showed mock products while
-- the admin backend stayed empty. Every relevant table is empty in prod
-- (4 test rows in `products`, 1 in `product_categories`), so this
-- consolidation is loss-free.
--
-- After this migration the canonical store family is:
--
--   gw_products
--     ├── gw_product_categories  (one category per product)
--     ├── gw_product_images      (many images per product)
--     └── gw_product_variants    (many variants per product;
--                                  option1/option2/option3 stay generic
--                                  so the admin can use them for Size,
--                                  Color, or anything else)
--
-- Plus two EasyPost tables added for Phase C:
--
--   gw_shipping_settings   (one row per tenant — API key + warehouse)
--   gw_shipments           (one row per shipment with tracking)
--
-- Multi-tenant safety: every table gets `tenant_id` default
-- `current_tenant_id()` plus a RESTRICTIVE RLS policy matching the
-- pattern used by 580+ other tenant-scoped tables in this schema.

-- ───────────────────────────────────────────────────────────────────
-- 1. Drop the parallel `products` family (empty tables).
-- ───────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.product_images CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 2. Wipe the canonical tables so every tenant starts blank.
-- ───────────────────────────────────────────────────────────────────

TRUNCATE TABLE public.gw_product_variants CASCADE;
TRUNCATE TABLE public.gw_products CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 3. Extend gw_products with the columns ProductManager needs +
--    EasyPost dimensional shipping fields (length/width/height/weight).
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_products
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN DEFAULT TRUE,
  -- EasyPost rate quotes need real package dims. Stored on the product
  -- (variants can override if needed) and used for the per-line
  -- shipment calc at checkout.
  ADD COLUMN IF NOT EXISTS weight_oz NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS length_in NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS width_in  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS height_in NUMERIC(6,2);

-- Backfill `name` from `title` so the column is usable without breaking
-- any code still reading title. Both stay in sync via the trigger below.
UPDATE public.gw_products SET name = COALESCE(name, title);

-- ───────────────────────────────────────────────────────────────────
-- 4. Tenant-scoped product categories (replaces the dropped
--    public.product_categories).
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL DEFAULT current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_gw_product_categories_tenant_id
  ON public.gw_product_categories(tenant_id);

ALTER TABLE public.gw_products
  ADD CONSTRAINT gw_products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.gw_product_categories(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────────
-- 5. Tenant-scoped product images (replaces the dropped
--    public.product_images). gw_products.images (text[]) stays for
--    quick storefront thumbnails, but each row in gw_product_images is
--    the authoritative per-image record the admin can reorder and
--    caption.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL DEFAULT current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  alt_text   TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_product_images_tenant_id
  ON public.gw_product_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_product_images_product_id
  ON public.gw_product_images(product_id);

-- ───────────────────────────────────────────────────────────────────
-- 6. Phase C: EasyPost integration tables.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_shipping_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL UNIQUE DEFAULT current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  easypost_api_key TEXT,             -- Per-tenant key; read server-side only.
  -- Warehouse / pickup address that ships to buyers. EasyPost requires
  -- a structured address rather than free-text.
  from_name       TEXT,
  from_company    TEXT,
  from_street1    TEXT,
  from_street2    TEXT,
  from_city       TEXT,
  from_state      TEXT,
  from_zip        TEXT,
  from_country    TEXT DEFAULT 'US',
  from_phone      TEXT,
  from_email      TEXT,
  -- Default carrier preference — falls back to EasyPost's rate-shopping
  -- when null.
  preferred_carrier TEXT,
  preferred_service TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_shipping_settings_tenant
  ON public.gw_shipping_settings(tenant_id);

CREATE TABLE IF NOT EXISTS public.gw_shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL DEFAULT current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id          UUID REFERENCES public.gw_orders(id) ON DELETE SET NULL,
  easypost_shipment_id TEXT,    -- EasyPost shp_*
  rate_id           TEXT,        -- EasyPost rate_* chosen at purchase
  carrier           TEXT,
  service           TEXT,
  amount_cents      INTEGER,     -- Customer-paid shipping
  cost_cents        INTEGER,     -- Tenant cost from EasyPost
  tracking_number   TEXT,
  tracking_url      TEXT,
  label_url         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | label_purchased | in_transit | delivered | returned
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_shipments_tenant_id
  ON public.gw_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_shipments_order_id
  ON public.gw_shipments(order_id);

-- ───────────────────────────────────────────────────────────────────
-- 7. RLS — RESTRICTIVE tenant isolation matching the rest of the schema.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_shipping_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_shipments          ENABLE ROW LEVEL SECURITY;

-- Permissive policy: authenticated users can see/modify rows in their tenant.
-- Anon users can READ categories + images (storefront browsing) but
-- can't modify them. The RESTRICTIVE policy below clamps everything to
-- the JWT's tenant.
DROP POLICY IF EXISTS gw_pc_authn_all ON public.gw_product_categories;
CREATE POLICY gw_pc_authn_all ON public.gw_product_categories
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS gw_pc_anon_read ON public.gw_product_categories;
CREATE POLICY gw_pc_anon_read ON public.gw_product_categories
  FOR SELECT TO anon USING (is_active = TRUE);

DROP POLICY IF EXISTS gw_pi_authn_all ON public.gw_product_images;
CREATE POLICY gw_pi_authn_all ON public.gw_product_images
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS gw_pi_anon_read ON public.gw_product_images;
CREATE POLICY gw_pi_anon_read ON public.gw_product_images
  FOR SELECT TO anon USING (TRUE);

DROP POLICY IF EXISTS gw_ss_authn_all ON public.gw_shipping_settings;
CREATE POLICY gw_ss_authn_all ON public.gw_shipping_settings
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS gw_shp_authn_all ON public.gw_shipments;
CREATE POLICY gw_shp_authn_all ON public.gw_shipments
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- RESTRICTIVE tenant clamp — applies on top of the permissive policies
-- above. Matches the 580-table multi-tenant pattern (see memory note
-- "GleeWorld multi-tenant model").
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_product_categories;
CREATE POLICY tenant_isolation_restrict ON public.gw_product_categories
  AS RESTRICTIVE FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_product_images;
CREATE POLICY tenant_isolation_restrict ON public.gw_product_images
  AS RESTRICTIVE FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_shipping_settings;
CREATE POLICY tenant_isolation_restrict ON public.gw_shipping_settings
  AS RESTRICTIVE FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_shipments;
CREATE POLICY tenant_isolation_restrict ON public.gw_shipments
  AS RESTRICTIVE FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ───────────────────────────────────────────────────────────────────
-- 8. BEFORE INSERT triggers to stamp tenant_id from the JWT when the
--    client omits it, per the multi-tenant pattern.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tenant_id_default ON public.gw_product_categories;
CREATE TRIGGER set_tenant_id_default
  BEFORE INSERT ON public.gw_product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS set_tenant_id_default ON public.gw_product_images;
CREATE TRIGGER set_tenant_id_default
  BEFORE INSERT ON public.gw_product_images
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS set_tenant_id_default ON public.gw_shipping_settings;
CREATE TRIGGER set_tenant_id_default
  BEFORE INSERT ON public.gw_shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS set_tenant_id_default ON public.gw_shipments;
CREATE TRIGGER set_tenant_id_default
  BEFORE INSERT ON public.gw_shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- ───────────────────────────────────────────────────────────────────
-- 9. Keep gw_products.name and gw_products.title in sync. Frontend
--    code reads either depending on origin (ProductManager uses name,
--    storefront uses title); we backfill both on write so neither view
--    breaks while the migration lands.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_products_sync_name_title()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.name := NEW.title;
  ELSIF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
    NEW.title := NEW.name;
  ELSIF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.title = OLD.title THEN
    NEW.title := NEW.name;
  ELSIF TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.name = OLD.name THEN
    NEW.name := NEW.title;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_products_sync_name_title ON public.gw_products;
CREATE TRIGGER gw_products_sync_name_title
  BEFORE INSERT OR UPDATE ON public.gw_products
  FOR EACH ROW EXECUTE FUNCTION public.gw_products_sync_name_title();

-- Tell PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
