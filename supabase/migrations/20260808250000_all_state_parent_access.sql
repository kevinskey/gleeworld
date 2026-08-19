-- All-State parent access — the deferred decision, resolved the way the brief
-- itself resolves it: "Determine whether GleeWorld has a guardian/parent
-- account type today. If it does: use it. Read-only projection of the
-- participation." It does — the self-registering `parent` role with verified
-- gw_parent_children links (20260729190000) — so no new auth concept is
-- invented here, and the signed-share-link alternative stays unbuilt.
--
-- THE SCOPE IS ACCEPTANCE CRITERION 6, TAKEN LITERALLY: "A parent sees dates,
-- cost, and location — and nothing else." So the projection carries which
-- program their child is in and the child's upcoming deadline dates. It does
-- NOT carry: status, results, alternate rank, voice parts, scores,
-- adjudicator or director notes, checklist completion, or anything about any
-- other student. Costs and locations come from the PUBLIC state pages, which
-- the parent-facing UI links to — no private fee data exists to project.
--
-- Same mechanism as the student views, for the same reason: RLS filters rows,
-- not columns, so privacy-by-projection is the only shape that can't leak
-- when someone later adds a column to the base table. Definer-rights views;
-- the WHERE is the entire fence:
--   verified parent link  AND  parent is the caller  AND  same tenant.

BEGIN;

DROP VIEW IF EXISTS public.gw_all_state_my_children;
CREATE VIEW public.gw_all_state_my_children
WITH (security_barrier = true) AS
SELECT
  pa.id            AS participation_id,
  child.first_name AS child_first_name,
  prog.name        AS program_name,
  prog.season      AS program_season,
  st.name          AS state_name,
  st.slug          AS state_slug,
  c.name           AS cohort_name
FROM public.gw_parent_children pc
JOIN public.gw_profiles child ON child.user_id = pc.student_id
JOIN public.gw_all_state_participations pa ON pa.student_id = child.id
JOIN public.gw_all_state_cohorts c ON c.id = pa.cohort_id
JOIN public.gw_all_state_programs prog ON prog.id = pa.program_id
JOIN public.gw_all_state_states st ON st.id = prog.state_id
WHERE pc.parent_id = auth.uid()
  AND pc.verified = true
  AND pc.tenant_id = public.current_tenant_id()
  AND pa.tenant_id = pc.tenant_id
  AND pa.status <> 'withdrawn';

REVOKE ALL ON public.gw_all_state_my_children FROM anon;
GRANT SELECT ON public.gw_all_state_my_children TO authenticated;

COMMENT ON VIEW public.gw_all_state_my_children IS
  'Parent-facing projection, scoped to acceptance criterion 6: dates, cost, '
  'location and nothing else. status/results/notes/scores are intentionally '
  'absent. Do not add columns without reading the criterion.';

-- Upcoming dated items for the child — title and due date ONLY. Completion
-- state is the student's progress, not the parent's dashboard.
DROP VIEW IF EXISTS public.gw_all_state_my_children_dates;
CREATE VIEW public.gw_all_state_my_children_dates
WITH (security_barrier = true) AS
SELECT
  t.participation_id,
  t.title,
  t.due_at
FROM public.gw_all_state_tasks t
JOIN public.gw_all_state_participations pa ON pa.id = t.participation_id
JOIN public.gw_profiles child ON child.id = pa.student_id
JOIN public.gw_parent_children pc
  ON pc.student_id = child.user_id AND pc.parent_id = auth.uid() AND pc.verified = true
WHERE t.due_at IS NOT NULL
  AND pc.tenant_id = public.current_tenant_id()
  AND pa.tenant_id = pc.tenant_id;

REVOKE ALL ON public.gw_all_state_my_children_dates FROM anon;
GRANT SELECT ON public.gw_all_state_my_children_dates TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
