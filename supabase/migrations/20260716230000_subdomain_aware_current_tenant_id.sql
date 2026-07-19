-- Make current_tenant_id() subdomain-aware.
--
-- Problem: for AUTHENTICATED users the tenant scope came only from the JWT
-- tenant_id claim (or the profile home tenant). GleeWorld uses a single-tenant
-- JWT, so a user whose email is a member of MORE THAN ONE tenant (e.g. a
-- platform admin, or the same person invited to two tenants) resolved to their
-- HOME tenant on EVERY subdomain -- and therefore saw/received the home
-- tenant's chats and directory on another tenant's subdomain (cross-tenant).
--
-- Fix: if the signed-in user is a MEMBER of the tenant whose subdomain the
-- request is on (x-tenant-slug header, same source as anon_tenant_id()), scope
-- them to that tenant. Otherwise fall back to the JWT claim, then profile home.
-- No escalation: only tenants the user already belongs to are selectable.
--
-- Owner is supabase_admin (BYPASSRLS), so the gw_tenant_members/gw_tenants
-- lookups inside the function do not recurse into their own RLS.
--
-- Applied out-of-band to the self-hosted DB (supabase.gleeworld.org) 2026-07-16.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid;
  v_header_slug text;
  v_header_tenant uuid;
  v_claim_tenant uuid;
  v_profile_tenant uuid;
BEGIN
  v_uid := auth.uid();
  BEGIN
    v_header_slug := current_setting('request.headers', true)::json->>'x-tenant-slug';
  EXCEPTION WHEN OTHERS THEN v_header_slug := NULL; END;
  IF v_uid IS NOT NULL AND v_header_slug IS NOT NULL AND v_header_slug <> '' THEN
    SELECT id INTO v_header_tenant FROM gw_tenants WHERE slug = v_header_slug;
    IF v_header_tenant IS NOT NULL
       AND EXISTS (SELECT 1 FROM gw_tenant_members m WHERE m.user_id = v_uid AND m.tenant_id = v_header_tenant) THEN
      RETURN v_header_tenant;
    END IF;
  END IF;
  BEGIN
    v_claim_tenant := NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN v_claim_tenant := NULL; END;
  IF v_claim_tenant IS NOT NULL THEN RETURN v_claim_tenant; END IF;
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT tenant_id INTO v_profile_tenant FROM gw_profiles WHERE user_id = v_uid LIMIT 1;
  RETURN v_profile_tenant;
END;
$fn$;
