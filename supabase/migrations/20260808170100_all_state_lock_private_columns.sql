-- Close the hole left by 20260808170000.
--
-- That migration gave students curated views over participations and audition
-- attempts specifically so director_notes, scores and adjudicator_notes stay
-- private — RLS filters rows, not columns, so omitting them from a projection
-- is the only way to hide them.
--
-- But it left the Phase 2 policy `gw_all_state_participations_rw` in place,
-- which is `FOR ALL TO authenticated USING (true)`. That was correct while
-- these were director-only surfaces reached only from staff pages. The moment
-- students got a reason to query this schema it became the whole problem: any
-- authenticated tenant member could SELECT the base table and read every
-- student's director_notes, and every adjudicator comment and raw score.
--
-- The curated views were decorative until this migration. Same class of
-- mistake as tightening the grade-categories read policy while a sibling
-- FOR ALL policy still granted SELECT — a fence with a gate next to it.
--
-- Staff here means admin/super-admin or a profile role of instructor,
-- executive or director. Students reach their own data through
-- gw_all_state_my_participations and gw_all_state_my_audition_attempts.

BEGIN;

CREATE OR REPLACE FUNCTION public.gw_all_state_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.gw_profiles p
                  WHERE p.user_id = auth.uid()
                    AND p.role IN ('instructor','executive','director'));
$$;
REVOKE ALL ON FUNCTION public.gw_all_state_is_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.gw_all_state_is_staff() TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_all_state_participations',   -- director_notes
    'gw_all_state_audition_attempts',-- score, rank, adjudicator_notes
    'gw_all_state_cohorts',
    'gw_all_state_cohort_dates',
    'gw_all_state_section_part_map'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_rw', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.gw_all_state_is_staff()) '
      'WITH CHECK (public.gw_all_state_is_staff())', t || '_staff', t);
  END LOOP;
END $$;

COMMIT;

\echo ''
\echo '=== no USING(true) policy may remain on the private tables ==='
SELECT tablename, policyname, cmd, COALESCE(qual,'(null)') AS using_expr
  FROM pg_policies
 WHERE schemaname='public'
   AND tablename IN ('gw_all_state_participations','gw_all_state_audition_attempts',
                     'gw_all_state_cohorts','gw_all_state_cohort_dates',
                     'gw_all_state_section_part_map')
   AND policyname NOT LIKE 'demo_viewer%'
 ORDER BY tablename, policyname;

NOTIFY pgrst, 'reload schema';
