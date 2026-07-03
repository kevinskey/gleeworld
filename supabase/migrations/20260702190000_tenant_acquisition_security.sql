-- Tenant acquisition security hardening (2026-07-02 audit).
-- Closes three CONFIRMED-live vulnerabilities verified against production:
--   1. gw_tenants / gw_tenant_members had RLS off AND full anon/authenticated
--      write grants -> any caller could INSERT a super_admin membership row
--      (cross-tenant takeover) or rewrite/delete tenant rows.
--   2. handle_new_user_profile() copied `role` straight from client signup
--      metadata -> signing up with {role:'super_admin', tenant_slug:'victim'}
--      created a super_admin of any tenant.
--   3. gw_tenant_subscriptions / gw_tenant_plans had permissive FOR ALL write
--      policies scoped only by tenant_id -> a tenant could self-activate paid
--      modules / upgrade its plan with no Stripe payment.
-- Verified safe: no client code writes any of these tables; all legitimate
-- writes go through the superadmin API / Stripe webhook as service_role, which
-- bypasses both RLS and these grants. Reads are unchanged.

BEGIN;

-- 1. Revoke direct client writes on tenant + membership tables (keep SELECT).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.gw_tenants        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.gw_tenant_members FROM anon, authenticated;

-- 2. Never grant a privileged role from client-controlled signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Only non-privileged roles may be self-assigned at signup. Elevation to
  -- admin/super_admin must come from an invite or an admin action, never from
  -- raw_user_meta_data. Anything not whitelisted falls back to 'fan'.
  v_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'fan'));
  IF v_role NOT IN ('fan', 'member', 'student', 'singer', 'viewer') THEN
    v_role := 'fan';
  END IF;

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

-- 3. Billing tables become read-only to tenants; writes only via service_role.
--    (The replacement SELECT policy uses the identical qual the old FOR ALL
--     policy used for reads, so tenant read behavior is unchanged.)
DROP POLICY IF EXISTS tenant_subs_admin_write ON public.gw_tenant_subscriptions;
CREATE POLICY tenant_subs_tenant_read ON public.gw_tenant_subscriptions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_tenant_plans_admin_write ON public.gw_tenant_plans;
CREATE POLICY gw_tenant_plans_tenant_read ON public.gw_tenant_plans
  FOR SELECT USING (tenant_id = current_tenant_id());

COMMIT;
