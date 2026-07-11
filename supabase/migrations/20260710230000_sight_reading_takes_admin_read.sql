-- supabase/migrations/20260710230000_sight_reading_takes_admin_read.sql
-- Teacher-facing progress: let a tenant's admins/teachers read their students'
-- sight-reading takes. This is a PERMISSIVE SELECT policy, so it is OR-ed with
-- the existing student-owner policy (srt_owner) and AND-ed with the RESTRICTIVE
-- tenant isolation (srt_isolation) — an admin therefore sees every take IN THEIR
-- TENANT, and nothing outside it. Students are unaffected: they still see only
-- their own rows.
--
-- Reuses public.is_current_user_admin_or_super_admin() (is_admin OR is_super_admin
-- for auth.uid()), the same predicate ~73 other tenant policies use.
BEGIN;

DROP POLICY IF EXISTS srt_admin_read ON public.gw_sight_reading_takes;
CREATE POLICY srt_admin_read ON public.gw_sight_reading_takes
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin_or_super_admin());

COMMIT;
