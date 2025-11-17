-- Ensure MUS-240 (new grading system) has all 21 assignments active
-- 1) Update existing listening journals in gw_assignments to 20 points
UPDATE public.gw_assignments
SET points = 20,
    is_active = COALESCE(is_active, true)
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND assignment_type = 'listening_journal';

-- 2) Insert missing non-journal assignments if they don't already exist (by title)
WITH target_course AS (
  SELECT '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid AS id
), items AS (
  SELECT 'Reflection Paper 1'::text AS title, 'reflection_paper'::text AS assignment_type, 50::int AS points, 'writing'::text AS category, NULL::timestamptz AS due_at UNION ALL
  SELECT 'Reflection Paper 2', 'reflection_paper', 50, 'writing', NULL UNION ALL
  SELECT 'Reflection Paper 3', 'reflection_paper', 50, 'writing', NULL UNION ALL
  SELECT 'Group Project: Proposal', 'project', 20, 'project', NULL UNION ALL
  SELECT 'Group Project: Annotated Bibliography', 'project', 30, 'project', NULL UNION ALL
  SELECT 'Group AI Presentation', 'presentation', 100, 'project', NULL UNION ALL
  SELECT 'Midterm Exam', 'exam', 100, 'exam', NULL UNION ALL
  SELECT 'Final Exam / Reflection', 'exam', 50, 'exam', NULL UNION ALL
  SELECT 'Listening Journal 13', 'listening_journal', 20, 'listening', NULL
)
INSERT INTO public.gw_assignments (course_id, title, assignment_type, points, category, due_at, is_active, legacy_source)
SELECT tc.id, i.title, i.assignment_type, i.points, i.category, i.due_at, true, 'mus240_syllabus'
FROM items i
CROSS JOIN target_course tc
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_assignments g
  WHERE g.course_id = tc.id AND g.title = i.title
);

-- 3) Optional: normalize titles for existing journals to consistent naming if any are missing numeric suffixes
-- (No destructive changes; simply ensure is_active is true)
UPDATE public.gw_assignments
SET is_active = true
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND is_active IS DISTINCT FROM true;