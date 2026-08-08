-- Directors must be able to HEAR a student's submitted All-State recording.
-- gw_practice_recordings' read policy is self-or-flag-admin, which excludes
-- membership-granted admins (the same gap fixed across the All-State module
-- on 2026-08-08). Additive: tenant staff — profile-role OR membership-role,
-- via the shared gw_all_state_is_staff() — may read; the RESTRICTIVE tenant
-- policy still confines them to their own tenant's recordings.
BEGIN;
DROP POLICY IF EXISTS practice_recordings_read_tenant_staff ON public.gw_practice_recordings;
CREATE POLICY practice_recordings_read_tenant_staff
  ON public.gw_practice_recordings FOR SELECT TO authenticated
  USING (public.gw_all_state_is_staff());
COMMIT;
NOTIFY pgrst, 'reload schema';
