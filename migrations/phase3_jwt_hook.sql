-- Phase 3: GoTrue custom access token hook
-- Adds tenant_id to every JWT issued at sign-in / refresh.
-- For now: each user belongs to one tenant (gw_tenant_members), hook
-- picks the earliest-created membership. Multi-tenant switching is a
-- later feature.

BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_tenant_slug text;
  user_role text;
BEGIN
  claims := event->'claims';

  SELECT tm.tenant_id, t.slug, tm.role
  INTO user_tenant_id, user_tenant_slug, user_role
  FROM public.gw_tenant_members tm
  JOIN public.gw_tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = (event->>'user_id')::uuid
  ORDER BY tm.created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    claims := jsonb_set(claims, '{tenant_slug}', to_jsonb(user_tenant_slug));
    claims := jsonb_set(claims, '{tenant_role}', to_jsonb(user_role));
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- GoTrue calls this from the supabase_auth_admin role
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT SELECT ON public.gw_tenant_members TO supabase_auth_admin;
GRANT SELECT ON public.gw_tenants TO supabase_auth_admin;

-- Revoke from anon/authenticated so they cannot forge claims
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

COMMIT;

-- =======================================
-- Test the hook directly with a real user
-- =======================================
\echo ''
\echo '=== Hook output for a real Spelman user ==='
SELECT public.custom_access_token_hook(
  jsonb_build_object(
    'user_id', (SELECT id::text FROM auth.users LIMIT 1),
    'claims', jsonb_build_object(
      'role', 'authenticated',
      'sub', (SELECT id::text FROM auth.users LIMIT 1),
      'email', (SELECT email FROM auth.users LIMIT 1)
    ),
    'authentication_method', 'password'
  )
);
