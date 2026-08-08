-- Fix: real tenant admins could not use the All-State staff surfaces.
--
-- Found by auditing the staff gate against LIVE membership data rather than
-- fixtures. Two stacked problems:
--
-- 1. The live is_admin() checks ONLY the boolean flags (is_admin /
--    is_super_admin). The version in the migration history also accepts
--    role='admin', but the live DB has drifted — 11 competing redefinitions
--    exist in the history and the deployed one is the narrowest. Five real
--    tenant admins (profile role 'admin', is_admin=false) fail it.
--
-- 2. gw_all_state_is_staff() never consulted gw_tenant_members at all. Tenant
--    rights in this platform are granted by the MEMBERSHIP row — that is the
--    campbell-hs-chorus incident (2026-08-02) that useUserRole.ts documents:
--    "the membership row is what actually grants tenant rights, so it must
--    outrank the profile role." A provisioned tenant director whose profile
--    still says 'fan' had no All-State access.
--
-- The membership check is scoped to current_tenant_id(), so an admin of
-- tenant A gets staff rights only while operating in tenant A — the
-- RESTRICTIVE tenant policies still fence the rows regardless.

BEGIN;

CREATE OR REPLACE FUNCTION public.gw_all_state_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- Platform / profile flags and roles (live is_admin() is flag-only, so
    -- check the role values here explicitly rather than trusting it).
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin = true OR p.is_super_admin = true
              OR p.role IN ('admin','super-admin','super_admin',
                            'instructor','executive','director'))
    )
    -- Membership-granted rights for the tenant being operated in.
    OR EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid()
         AND m.tenant_id = public.current_tenant_id()
         AND m.role IN ('admin','director','owner',
                        'super-admin','super_admin')
    );
$$;

COMMIT;

\echo ''
\echo '=== members with tenant admin/director rights who still fail the gate (want 0) ==='
SELECT count(*) AS still_failing
  FROM gw_tenant_members m
  JOIN gw_profiles p ON p.user_id = m.user_id
 WHERE m.role IN ('admin','director','super-admin','super_admin','owner')
   AND NOT (p.is_admin OR p.is_super_admin
            OR p.role IN ('admin','super-admin','super_admin','instructor','executive','director')
            OR m.role IN ('admin','director','owner','super-admin','super_admin'));

NOTIFY pgrst, 'reload schema';

-- Addendum (same fix, found by the E2E test): gw_all_state_tasks_staff was
-- created in 20260808170000 with the old checks INLINED rather than calling
-- the function, so updating gw_all_state_is_staff() did not reach it and a
-- membership-admin could add students but not generate their tasks. Recreate
-- it against the function so there is one gate, not two drifting copies.
BEGIN;
DROP POLICY IF EXISTS gw_all_state_tasks_staff ON public.gw_all_state_tasks;
CREATE POLICY gw_all_state_tasks_staff
  ON public.gw_all_state_tasks FOR ALL TO authenticated
  USING (public.gw_all_state_is_staff())
  WITH CHECK (public.gw_all_state_is_staff());
COMMIT;
NOTIFY pgrst, 'reload schema';
