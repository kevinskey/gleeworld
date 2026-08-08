-- All-State Phase 3 (part 1) — student self-access.
--
-- A student must see their own participation, checklist and deadlines. They
-- must NOT see director_notes, adjudicator_notes, other students' rows, or
-- audition scores.
--
-- WHY A VIEW RATHER THAN A POLICY ON THE BASE TABLE.
-- Postgres RLS filters ROWS, not COLUMNS. A policy letting a student SELECT
-- their own participation row lets them select ALL of it, director_notes
-- included — the UI would hide the column and the API would happily return it.
-- So the base table stays director-only and students read a curated view whose
-- projection simply does not contain the private columns. Same reasoning as
-- gw_worship_aid_by_token (20260805233000): "the private columns are simply
-- never in its result."
--
-- The views are NOT security_invoker, so they run with the definer's rights
-- and their WHERE clause is the entire fence. That clause is therefore
-- load-bearing and deliberately narrow: it joins through gw_profiles.user_id
-- to auth.uid(), and it re-applies the tenant check rather than assuming the
-- base table's RLS will (it is bypassed here).
--
-- TASKS ARE DIFFERENT. A task row has no private column — the whole point is
-- the student sees it — and a student needs to tick items off. So tasks get a
-- real RLS policy plus a COLUMN-level UPDATE grant, which is how a student can
-- mark work done without being able to rewrite the title or the due date.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Curated read-only projections for students.
-- ─────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.gw_all_state_my_participations;
CREATE VIEW public.gw_all_state_my_participations
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.cohort_id,
  p.program_id,
  p.status,
  p.final_result,
  p.alternate_rank,
  p.audition_voice_part_id,
  p.assigned_voice_part_id,
  p.withdrawn_at,
  p.created_at,
  c.name        AS cohort_name,
  prog.name     AS program_name,
  prog.season   AS program_season,
  st.name       AS state_name,
  st.slug       AS state_slug
  -- director_notes is deliberately absent and must stay absent.
FROM public.gw_all_state_participations p
JOIN public.gw_profiles              me   ON me.id = p.student_id
JOIN public.gw_all_state_cohorts     c    ON c.id  = p.cohort_id
JOIN public.gw_all_state_programs    prog ON prog.id = p.program_id
JOIN public.gw_all_state_states      st   ON st.id = prog.state_id
WHERE me.user_id = auth.uid()
  AND p.tenant_id = public.current_tenant_id();

REVOKE ALL ON public.gw_all_state_my_participations FROM anon;
GRANT SELECT ON public.gw_all_state_my_participations TO authenticated;

COMMENT ON VIEW public.gw_all_state_my_participations IS
  'Student-facing projection of gw_all_state_participations. director_notes is '
  'intentionally excluded — RLS filters rows, not columns, so the omission here '
  'is the only thing keeping it private. Do not add columns without checking.';

-- Attempts: a student may see that a round happened and whether they advanced,
-- but not the adjudicator''s comments or the raw score. Which of those a tenant
-- wants revealed is a per-tenant policy question the brief flags; until that
-- exists, the conservative projection is the right default.
DROP VIEW IF EXISTS public.gw_all_state_my_audition_attempts;
CREATE VIEW public.gw_all_state_my_audition_attempts
WITH (security_barrier = true) AS
SELECT
  a.id,
  a.participation_id,
  a.round_number,
  a.round_label,
  a.scheduled_at,
  a.submitted_at,
  a.format,
  a.advanced,
  a.result
  -- score, score_scale, rank, adjudicator_notes deliberately absent.
FROM public.gw_all_state_audition_attempts a
JOIN public.gw_all_state_participations p ON p.id = a.participation_id
JOIN public.gw_profiles me ON me.id = p.student_id
WHERE me.user_id = auth.uid()
  AND a.tenant_id = public.current_tenant_id();

REVOKE ALL ON public.gw_all_state_my_audition_attempts FROM anon;
GRANT SELECT ON public.gw_all_state_my_audition_attempts TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Tasks: real row policy + column-level write.
--
-- The existing permissive gw_all_state_tasks_rw policy is USING (true) for any
-- authenticated tenant member, which was fine while these were director-only
-- surfaces but is too broad now that students reach the table. Replace it with
-- an explicit pair: staff get everything, a student gets only their own rows.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS gw_all_state_tasks_rw ON public.gw_all_state_tasks;

CREATE POLICY gw_all_state_tasks_staff
  ON public.gw_all_state_tasks FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.gw_profiles p
                WHERE p.user_id = auth.uid()
                  AND p.role IN ('instructor','executive','director'))
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.gw_profiles p
                WHERE p.user_id = auth.uid()
                  AND p.role IN ('instructor','executive','director'))
  );

CREATE POLICY gw_all_state_tasks_own
  ON public.gw_all_state_tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = gw_all_state_tasks.participation_id
       AND me.user_id = auth.uid()));

CREATE POLICY gw_all_state_tasks_own_complete
  ON public.gw_all_state_tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = gw_all_state_tasks.participation_id
       AND me.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = gw_all_state_tasks.participation_id
       AND me.user_id = auth.uid()));

-- The policy says WHICH ROWS; this says WHICH COLUMNS. Without it a student
-- could satisfy the policy and still rewrite the task's title or due date.
REVOKE UPDATE ON public.gw_all_state_tasks FROM authenticated;
GRANT UPDATE (completed_at, completed_by) ON public.gw_all_state_tasks TO authenticated;

-- Practice links: a student records their own practice against a requirement.
DROP POLICY IF EXISTS gw_all_state_practice_links_rw ON public.gw_all_state_practice_links;
CREATE POLICY gw_all_state_practice_links_own
  ON public.gw_all_state_practice_links FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = gw_all_state_practice_links.participation_id
       AND (me.user_id = auth.uid()
            OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_all_state_participations p
      JOIN public.gw_profiles me ON me.id = p.student_id
     WHERE p.id = gw_all_state_practice_links.participation_id
       AND (me.user_id = auth.uid()
            OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));

COMMIT;

\echo ''
\echo '=== student-facing views (director_notes must NOT appear) ==='
SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name IN ('gw_all_state_my_participations','gw_all_state_my_audition_attempts')
 GROUP BY table_name;

\echo ''
\echo '=== task policies ==='
SELECT policyname, cmd, permissive FROM pg_policies
 WHERE schemaname='public' AND tablename='gw_all_state_tasks'
   AND policyname NOT LIKE 'demo_viewer%' ORDER BY policyname;

NOTIFY pgrst, 'reload schema';
