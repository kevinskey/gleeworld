-- Onboarding admin fixes (2026-08-02, campbell-hs-chorus incident).
--
-- Three stacked failures left a provisioned tenant admin looking like a fan
-- and bounced the platform owner off tenant subdomains:
--   1. useUserRole read only gw_profiles (home-tenant role) — the
--      gw_tenant_members.role that provisioning sets was never consulted.
--      → get_my_membership_role() RPC below; the hook reads it per tenant.
--   2. custom_access_token_hook emitted no is_super_admin claim, but
--      AuthContext's platform-owner bypass checked claims.is_super_admin —
--      the bypass never fired, so the platform owner was redirected to
--      gleeworld.org from every tenant subdomain.
--   3. The hook's tenant resolution relied on gw_profiles.tenant_id pointing
--      at the newest-provisioned tenant, which the 08-02 profile-clobber fix
--      stopped maintaining for existing users. Admin-role memberships now
--      outrank fan memberships in the fallback ordering.

-- 1. Per-tenant role for the CURRENT tenant (x-tenant-slug aware via
-- current_tenant_id()). Returns NULL when the user has no membership there.
CREATE OR REPLACE FUNCTION public.get_my_membership_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role
  FROM gw_tenant_members m
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = current_tenant_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_membership_role() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_membership_role() TO authenticated;

-- 2+3. JWT hook: emit is_super_admin; prefer admin-role memberships over
-- fan memberships when the profile's home tenant doesn't decide.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_tenant_slug text;
  user_role text;
  user_is_demo_viewer boolean;
  user_is_super_admin boolean;
BEGIN
  claims := event->'claims';

  SELECT tm.tenant_id, t.slug, tm.role
  INTO user_tenant_id, user_tenant_slug, user_role
  FROM public.gw_tenant_members tm
  JOIN public.gw_tenants t ON t.id = tm.tenant_id
  LEFT JOIN public.gw_profiles p ON p.user_id = tm.user_id
  WHERE tm.user_id = (event->>'user_id')::uuid
  ORDER BY (tm.tenant_id = p.tenant_id) DESC NULLS LAST,
           (tm.role IN ('super-admin','super_admin','admin','director')) DESC,
           tm.created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    claims := jsonb_set(claims, '{tenant_slug}', to_jsonb(user_tenant_slug));
    claims := jsonb_set(claims, '{tenant_role}', to_jsonb(user_role));
  END IF;

  SELECT COALESCE(p.is_demo_viewer, false), COALESCE(p.is_super_admin, false)
  INTO user_is_demo_viewer, user_is_super_admin
  FROM public.gw_profiles p
  WHERE p.user_id = (event->>'user_id')::uuid;

  IF user_is_demo_viewer THEN
    claims := jsonb_set(claims, '{demo_viewer}', to_jsonb(true));
  END IF;
  IF user_is_super_admin THEN
    claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(true));
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$function$;
