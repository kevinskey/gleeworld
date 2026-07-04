ALTER TABLE public.gw_store_orders ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS public.gw_store_checkout_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_store_attempts_ip ON public.gw_store_checkout_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_gw_store_attempts_email ON public.gw_store_checkout_attempts(email, created_at);
ALTER TABLE public.gw_store_checkout_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_only ON public.gw_store_checkout_attempts;
CREATE POLICY service_role_only ON public.gw_store_checkout_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.gw_store_list_products()
RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.price, p.sale_price, p.requires_shipping, p.images, p.description
  FROM public.gw_products p
  WHERE p.tenant_id = 'bb48609d-a1ca-4905-be50-b84afdac187e' AND p.is_active = true
  ORDER BY p.is_featured DESC NULLS LAST, p.name;
$$;
REVOKE ALL ON FUNCTION public.gw_store_list_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_list_products() TO anon, authenticated, service_role;
