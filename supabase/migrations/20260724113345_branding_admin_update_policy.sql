-- gw_branding_settings has a permissive INSERT policy for admins
-- ("branding insert" in 20260708030000_platform_owner_branding.sql) but no
-- matching UPDATE policy. The Save Branding button uses .upsert() with
-- onConflict: 'tenant_id', which lands as INSERT ... ON CONFLICT DO UPDATE.
-- The UPDATE half needs a permissive UPDATE policy or Postgres silently
-- rejects it (RESTRICTIVE tenant_isolation_restrict alone isn't enough;
-- it's a gate, not a grant). Result: 0 rows affected, no error, and the
-- next page load reads the untouched original row — the bug users report
-- as "workspace color still doesn't work".
--
-- Grants admins and super-admins in the caller's tenant permission to
-- UPDATE their tenant's branding row. Cross-tenant writes are still
-- blocked by tenant_isolation_restrict; the platform-owner exemption
-- from 20260708030000 stays in effect.

DROP POLICY IF EXISTS "branding update" ON public.gw_branding_settings;
CREATE POLICY "branding update" ON public.gw_branding_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super-admin', 'admin']))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
        AND (p.is_super_admin = true OR p.is_admin = true
             OR p.role = ANY (ARRAY['super-admin', 'admin']))
    )
  );
