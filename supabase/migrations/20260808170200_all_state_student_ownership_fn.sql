-- Fix: a student could not see their own tasks.
--
-- 20260808170000 gave students a task policy of the form
--
--   EXISTS (SELECT 1 FROM gw_all_state_participations p
--             JOIN gw_profiles me ON me.id = p.student_id
--            WHERE p.id = tasks.participation_id AND me.user_id = auth.uid())
--
-- which reads correctly and does not work, because the subquery over
-- gw_all_state_participations is ITSELF subject to that table's RLS. Once
-- 20260808170100 made participations staff-only, the EXISTS evaluated against
-- zero visible rows and returned false for every student. The policy did not
-- error; it just quietly denied everything.
--
-- This is the standard RLS trap: a policy that reads another protected table
-- sees that table through the *caller's* policies, not the owner's. The fix is
-- a SECURITY DEFINER function, which runs as its owner and therefore sees the
-- rows it needs to answer the ownership question — while returning only a
-- boolean, so it leaks nothing.
--
-- Caught by tests/all_state_student_access_test.sql, which asserted the student
-- could see exactly one task and got zero.

BEGIN;

CREATE OR REPLACE FUNCTION public.gw_all_state_owns_participation(p_participation uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = p_participation
       AND me.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.gw_all_state_owns_participation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gw_all_state_owns_participation(uuid) TO authenticated;

DROP POLICY IF EXISTS gw_all_state_tasks_own          ON public.gw_all_state_tasks;
DROP POLICY IF EXISTS gw_all_state_tasks_own_complete ON public.gw_all_state_tasks;

CREATE POLICY gw_all_state_tasks_own
  ON public.gw_all_state_tasks FOR SELECT TO authenticated
  USING (public.gw_all_state_owns_participation(participation_id));

CREATE POLICY gw_all_state_tasks_own_complete
  ON public.gw_all_state_tasks FOR UPDATE TO authenticated
  USING (public.gw_all_state_owns_participation(participation_id))
  WITH CHECK (public.gw_all_state_owns_participation(participation_id));

DROP POLICY IF EXISTS gw_all_state_practice_links_own ON public.gw_all_state_practice_links;
CREATE POLICY gw_all_state_practice_links_own
  ON public.gw_all_state_practice_links FOR ALL TO authenticated
  USING (public.gw_all_state_owns_participation(participation_id)
         OR public.gw_all_state_is_staff())
  WITH CHECK (public.gw_all_state_owns_participation(participation_id)
              OR public.gw_all_state_is_staff());

-- The two student-facing VIEWS were unaffected: they are not security_invoker,
-- so they already run with definer rights and never consulted the caller's
-- policies. That is why the participations view returned 1 row in the same
-- test run where the task policy returned 0 — a useful confirmation that the
-- two mechanisms are genuinely different.

COMMIT;

NOTIFY pgrst, 'reload schema';
