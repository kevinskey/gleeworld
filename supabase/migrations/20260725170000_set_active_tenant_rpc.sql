-- set_active_tenant(target_slug) — pivot the caller's active tenant.
--
-- Cross-tenant switching (avatar dropdown / assistant switch_world tool)
-- was landing users on the destination subdomain with a JWT that still
-- carried the SOURCE tenant's tenant_slug claim. Since the JWT is what
-- current_tenant_id() reads for RLS, all data + branding came from the
-- source tenant even though the URL / __TENANT_CONFIG__ said the
-- destination — leading to cross-tenant note leak and stale branding.
--
-- The custom_access_token_hook (see 20260703120000_jwt_hook_prefer_profile_tenant.sql)
-- picks the tenant claim from the membership matching gw_profiles.tenant_id.
-- So the fix is: update gw_profiles.tenant_id to the target, then have
-- the client call supabase.auth.refreshSession() — the hook re-fires and
-- the new JWT carries the destination tenant_slug.
--
-- This RPC does the update from a controlled surface:
--   - SECURITY DEFINER so RLS on gw_profiles can't reject the write for
--     being cross-tenant. The row's owner is unchanged (still auth.uid());
--     only the tenant_id column shifts.
--   - Verifies the caller is actually a member of the target tenant via
--     gw_tenant_members — no way to pin your JWT to a tenant you don't
--     belong to.
--   - Returns the resolved tenant slug (so the client can double-check).

CREATE OR REPLACE FUNCTION public.set_active_tenant(target_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000';
  END IF;

  SELECT t.id
    INTO v_tenant_id
  FROM public.gw_tenants t
  JOIN public.gw_tenant_members m
    ON m.tenant_id = t.id
   AND m.user_id  = v_uid
  WHERE t.slug = target_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'not_a_member_of_%', target_slug USING ERRCODE = '42501';
  END IF;

  UPDATE public.gw_profiles
     SET tenant_id = v_tenant_id,
         updated_at = now()
   WHERE user_id = v_uid;

  RETURN target_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_tenant(text) TO authenticated;
