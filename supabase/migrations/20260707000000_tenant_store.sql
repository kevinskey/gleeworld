-- Tenant Store add-on: tenant-scoped, add-on-gated catalog RPC.
-- Returns active products for a given tenant slug, ONLY if that tenant
-- has an active/trial 'store' module subscription.

CREATE OR REPLACE FUNCTION public.gw_store_list_tenant_products(p_tenant_slug text)
RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.price, p.sale_price, p.requires_shipping, p.images, p.description
  FROM public.gw_products p
  JOIN public.gw_tenants t ON t.id = p.tenant_id AND t.slug = p_tenant_slug
  WHERE p.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.gw_tenant_subscriptions s
      WHERE s.tenant_id = t.id AND s.module_id = 'store' AND s.status IN ('active','trial')
    )
  ORDER BY p.is_featured DESC NULLS LAST, p.name;
$$;
REVOKE ALL ON FUNCTION public.gw_store_list_tenant_products(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_list_tenant_products(text) TO anon, authenticated, service_role;
