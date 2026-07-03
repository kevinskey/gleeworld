-- Fix: a returning user who buys a new tenant signed into the WRONG tenant.
--
-- The access-token hook picked the user's EARLIEST membership
-- (ORDER BY tm.created_at ASC), so anyone who had ever joined another
-- tenant (most commonly the demo choir) kept getting that old tenant's
-- claim after being provisioned as super-admin of their own new site.
--
-- New resolution order:
--   1. The membership matching gw_profiles.tenant_id — provisioning
--      (superadmin API step 4) points the profile at the tenant the user
--      most recently became an admin of, so this selects the new site.
--   2. Fallback: earliest membership (legacy behavior, unchanged for every
--      user whose profile already matches their first membership).
--
-- Run as supabase_admin (function owner). CREATE OR REPLACE preserves the
-- existing grants: EXECUTE to supabase_auth_admin only.

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
BEGIN
  claims := event->'claims';

  SELECT tm.tenant_id, t.slug, tm.role
  INTO user_tenant_id, user_tenant_slug, user_role
  FROM public.gw_tenant_members tm
  JOIN public.gw_tenants t ON t.id = tm.tenant_id
  LEFT JOIN public.gw_profiles p ON p.user_id = tm.user_id
  WHERE tm.user_id = (event->>'user_id')::uuid
  ORDER BY (tm.tenant_id = p.tenant_id) DESC NULLS LAST, tm.created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    claims := jsonb_set(claims, '{tenant_slug}', to_jsonb(user_tenant_slug));
    claims := jsonb_set(claims, '{tenant_role}', to_jsonb(user_role));
  END IF;

  SELECT COALESCE(p.is_demo_viewer, false)
  INTO user_is_demo_viewer
  FROM public.gw_profiles p
  WHERE p.user_id = (event->>'user_id')::uuid;

  IF user_is_demo_viewer THEN
    claims := jsonb_set(claims, '{demo_viewer}', to_jsonb(true));
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$function$;
