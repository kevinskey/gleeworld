-- my_tenants(): every tenant the signed-in user is a member of, for the
-- account menu's "Switch organization" list.
--
-- gw_tenant_members is RLS-scoped to the current tenant, so a client on
-- tenant A's subdomain cannot see the user's membership in tenant B. This
-- SECURITY DEFINER function reads across that per-tenant RLS, but is scoped
-- strictly to auth.uid() in the WHERE clause — a user only ever sees tenants
-- they already belong to, so there is no escalation and no cross-user leak.
--
-- Owner must be a BYPASSRLS/superuser role (created via postgres) so the
-- gw_tenant_members/gw_tenants reads don't recurse into their own RLS.
CREATE OR REPLACE FUNCTION public.my_tenants()
RETURNS TABLE(tenant_id uuid, slug text, name text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id, t.slug, t.name, m.role
  FROM public.gw_tenant_members m
  JOIN public.gw_tenants t ON t.id = m.tenant_id
  WHERE m.user_id = auth.uid()
  ORDER BY t.name NULLS LAST, t.slug;
$$;

GRANT EXECUTE ON FUNCTION public.my_tenants() TO authenticated;
