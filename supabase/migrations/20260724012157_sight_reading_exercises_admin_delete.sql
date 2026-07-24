-- Let tenant admins delete/update ANY sight-reading exercise, not just their
-- own. The original policies (20250810031542_...) scoped write access to the
-- owner via `owner_id = auth.uid()`, which meant an admin looking at the
-- Library tab couldn't remove seed exercises or work another admin authored
-- for the tenant — the delete returned "0 rows" silently (RLS with no
-- matching policy is not an error, just a no-op) and the UI's optimistic
-- remove looked successful until the next reload put the row back.
--
-- Mirrors the admin-override pattern used elsewhere in this codebase
-- (e.g. tour_contract_signatures 20260302005038): subquery against
-- gw_profiles for is_admin OR is_super_admin. Owner rights preserved via
-- the original owner-scoped policies (RLS is additive across policies).

DROP POLICY IF EXISTS "Admins can delete any sight reading exercise"
  ON public.gw_sight_reading_exercises;
CREATE POLICY "Admins can delete any sight reading exercise"
  ON public.gw_sight_reading_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ));

DROP POLICY IF EXISTS "Admins can update any sight reading exercise"
  ON public.gw_sight_reading_exercises;
CREATE POLICY "Admins can update any sight reading exercise"
  ON public.gw_sight_reading_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ));
