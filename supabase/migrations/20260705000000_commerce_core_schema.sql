CREATE TABLE IF NOT EXISTS public.gw_store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  store_type TEXT NOT NULL CHECK (store_type IN ('gleeworld','tenant')),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_session_id TEXT UNIQUE,
  provider_payment_intent_id TEXT UNIQUE,
  buyer_email TEXT NOT NULL,
  buyer_user_id UUID NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  requires_shipping BOOLEAN NOT NULL DEFAULT false,
  ship_to_name TEXT, ship_to_line1 TEXT, ship_to_line2 TEXT, ship_to_city TEXT,
  ship_to_state TEXT, ship_to_postal TEXT, ship_to_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gw_store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.gw_store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE RESTRICT,
  variant_id UUID NULL REFERENCES public.gw_product_variants(id) ON DELETE RESTRICT,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  is_digital BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.gw_store_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.gw_store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE RESTRICT,
  buyer_user_id UUID NULL,
  buyer_email TEXT NOT NULL,
  download_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ NULL,
  last_download_ip TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_store_orders_tenant_status ON public.gw_store_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gw_store_order_items_order ON public.gw_store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_gw_store_entitlements_order ON public.gw_store_entitlements(order_id);

ALTER TABLE public.gw_store_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_store_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_store_orders','gw_store_order_items','gw_store_entitlements'] LOOP
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', t);
    EXECUTE format('CREATE POLICY service_role_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
