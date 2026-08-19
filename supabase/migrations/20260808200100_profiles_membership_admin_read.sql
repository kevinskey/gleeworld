-- Membership-granted tenant admins can now read their tenant's roster.
--
-- Found by an end-to-end test running as the REAL demo-choir admin: adding
-- two of their own students to an All-State cohort inserted zero rows,
-- because the SELECT over gw_profiles saw only the admin themselves.
--
-- Every permissive SELECT policy on gw_profiles gates on flag-based helpers
-- (is_admin_user / is_admin, both checking only the is_admin/is_super_admin
-- booleans in the live DB) or on self. A tenant admin whose rights come from
-- gw_tenant_members.role — which is how tenants are provisioned; the
-- campbell-hs-chorus incident is documented in useUserRole.ts — could not see
-- their own tenant's roster ANYWHERE: not in All-State, not in any directory
-- backed by this table. All five demo tenants' admins are in this state.
--
-- Fix is additive and narrow: one permissive SELECT policy admitting members
-- whose membership row for the CURRENT tenant is admin/director/owner. The
-- RESTRICTIVE tenant_isolation policy still ANDs on top, so this can never
-- reach across tenants — it only lets a tenant's own leadership see the
-- tenant's own people, which is what every roster surface already assumes.

BEGIN;

DROP POLICY IF EXISTS profiles_membership_admin_read ON public.gw_profiles;
CREATE POLICY profiles_membership_admin_read
  ON public.gw_profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
     WHERE m.user_id = auth.uid()
       AND m.tenant_id = public.current_tenant_id()
       AND m.role IN ('admin','director','owner','super-admin','super_admin')
  ));

COMMIT;
NOTIFY pgrst, 'reload schema';
