-- New signups were created with tenant_id NULL and no gw_tenant_members row:
-- the auth.users trigger runs without JWT claims, so current_tenant_id()
-- returns NULL, and nothing enrolled the user in a tenant. The RESTRICTIVE
-- tenant RLS then makes the profile invisible to the app entirely.
--
-- Fix: resolve the tenant inside the trigger from signup metadata
-- (options.data.tenant_slug, sent by the frontend from __TENANT_CONFIG__),
-- falling back to the 'main' tenant, and create the membership row that
-- custom_access_token_hook needs to mint the tenant_id JWT claim.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_role text;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.gw_tenants
  WHERE slug = COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'main');

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.gw_tenants WHERE slug = 'main';
  END IF;

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'fan');

  INSERT INTO public.gw_profiles (user_id, email, full_name, status, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      initcap(replace(replace(split_part(NEW.email, '@', 1), '.', ' '), '_', ' '))
    ),
    'active',
    v_role,
    v_tenant_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
  VALUES (NEW.id, v_tenant_id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: enroll existing profiles that have no tenant membership, using
-- the profile's tenant (already backfilled to 'main') and role.
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT p.user_id, p.tenant_id, COALESCE(p.role, 'fan')
FROM public.gw_profiles p
WHERE p.tenant_id IS NOT NULL
  -- skip stale profiles whose auth user was deleted (FK would reject them)
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.gw_tenant_members tm WHERE tm.user_id = p.user_id
  )
ON CONFLICT DO NOTHING;
