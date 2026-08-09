-- Fix: every client-side profile save fails with 42P17.
--
--   {"code":"42P17","message":"infinite recursion detected in policy
--    for relation \"gw_profiles\""}
--   POST /gw_profiles?on_conflict=user_id -> 500
--
-- gw_profiles_update_policy (added 2025-12-18 in 20251218041532 to let exec
-- board members edit voice parts) inlines a subquery against the very table
-- it protects:
--
--   OR EXISTS (SELECT 1 FROM public.gw_profiles
--              WHERE user_id = auth.uid() AND is_exec_board = true)
--
-- Evaluating that subquery re-enters RLS on gw_profiles, so Postgres aborts
-- the whole statement. It hits every UPDATE made by the `authenticated` role
-- — i.e. the Profile page, Profile Setup and the admin user panel. Writes
-- made by service_role never noticed, because service_role bypasses RLS.
--
-- The fix is the pattern the rest of this table already uses: call the
-- SECURITY DEFINER helper instead of inlining the lookup. is_gw_exec_board()
-- has the identical body, so the permission set is unchanged -- self, admins
-- (is_gw_admin_v2), exec board. The sibling policy exec_board_read_profiles
-- already calls it this way.
--
-- Verified against production inside a rolled-back transaction:
--   super_admin updating own row  -> UPDATE 1
--   plain student updating own row -> UPDATE 1
--   plain student updating another -> UPDATE 0 (still denied)

DROP POLICY IF EXISTS "gw_profiles_update_policy" ON public.gw_profiles;

CREATE POLICY "gw_profiles_update_policy" ON public.gw_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_gw_admin_v2()
  OR public.is_gw_exec_board()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_gw_admin_v2()
  OR public.is_gw_exec_board()
);

COMMENT ON POLICY "gw_profiles_update_policy" ON public.gw_profiles IS
  'Self, admins, exec board. Must call is_gw_exec_board() rather than inline '
  'a SELECT on gw_profiles -- an inline self-reference makes every '
  'authenticated UPDATE fail with 42P17 (infinite recursion in policy).';
