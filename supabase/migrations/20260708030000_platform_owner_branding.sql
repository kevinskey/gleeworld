-- Platform-owner cross-tenant branding management.
--
-- The platform owner (super-admin whose active tenant is 'main') operates every
-- tenant, so they need to edit any tenant's gw_branding_settings (logo, colors,
-- sign-in background) from Site Setup. But their JWT is scoped to 'main', so the
-- RESTRICTIVE tenant_isolation policy blocked cross-tenant writes — and there was
-- no INSERT policy at all — yielding "new row violates row-level security policy"
-- when saving another tenant's branding.
--
-- This grants a NARROW exemption: only this one low-sensitivity table, only the
-- platform owner. Normal tenant members and tenant-scoped super-admins are
-- unchanged — still confined to their own tenant (is_platform_owner() is false
-- for them because their JWT tenant_slug is not 'main').

-- Platform owner = super-admin whose active (JWT) tenant is 'main'. Gated on the
-- JWT slug (set server-side by the access-token hook, unspoofable) AND the DB
-- truth that the profile is a super-admin. SECURITY DEFINER so it can read
-- gw_profiles past that table's own RLS.
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((auth.jwt() ->> 'tenant_slug') = 'main', false)
     AND EXISTS (
       SELECT 1 FROM public.gw_profiles p
       WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
         AND p.is_super_admin = true
     );
$$;

-- Exempt the platform owner from tenant isolation on branding only. For everyone
-- else this is unchanged: tenant_id = current_tenant_id().
ALTER POLICY tenant_isolation_restrict ON public.gw_branding_settings
  USING (tenant_id = current_tenant_id() OR public.is_platform_owner())
  WITH CHECK (tenant_id = current_tenant_id() OR public.is_platform_owner());

-- Add the missing INSERT grant so a tenant's own admin (or the platform owner)
-- can create a first branding row. Row-level tenant scoping is still enforced by
-- the (now platform-owner-aware) RESTRICTIVE tenant_isolation WITH CHECK above.
DROP POLICY IF EXISTS "branding insert" ON public.gw_branding_settings;
CREATE POLICY "branding insert" ON public.gw_branding_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super-admin', 'admin']))
    )
  );
