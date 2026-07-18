-- Sync current_tenant_id() with the live, out-of-band-patched version on
-- supabase.gleeworld.org. The repo copy (20260716230000) fixed subdomain
-- awareness for TENANT MEMBERS but did not include the platform-owner
-- bypass that was applied directly to the droplet on 2026-07-17 (see
-- memory doc reference_current_tenant_id_subdomain_aware.md, "PLATFORM-
-- ADMIN model" section). Without this clause, an authenticated platform
-- owner (super-admin on the 'main' tenant) visiting a subdomain they are
-- NOT a gw_tenant_members row of falls through to the JWT claim / profile
-- home tenant instead of the subdomain they're actually on — which is
-- exactly the bug that caused Lyke House's real site content (logo, about
-- text, video, CTA link) to be written under tenant_id='main' on
-- 2026-07-16 while Kevin was configuring lykehouse.gleeworld.org under his
-- own (main-tenant) session, before this fix existed. That data is gone
-- (hard-deleted by a later "reset to template" cleanup) — Lyke House has
-- to re-enter it. This migration only prevents the bug CLASS from
-- recurring for any future platform-owner cross-tenant admin work; it is
-- not itself a data fix.
--
-- Without this migration, restoring the DB from committed migrations
-- alone (disaster recovery, staging rebuild) would silently regress to
-- the vulnerable pre-platform-owner-bypass behavior.
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
    -- Members get their tenant; a platform owner may operate in ANY tenant
    -- they visit (no escalation — is_platform_owner() itself requires
    -- tenant_slug='main' on the JWT + gw_profiles.is_super_admin).
    IF v_header_tenant IS NOT NULL
       AND (EXISTS (SELECT 1 FROM gw_tenant_members m WHERE m.user_id = v_uid AND m.tenant_id = v_header_tenant)
            OR is_platform_owner()) THEN
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
