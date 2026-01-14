-- Backfill MUS 210 assignments into gw_course_assignments so they appear in the current UI
-- Source: gw_assignments (phase-based)
-- Target: gw_course_assignments (student-facing list uses is_published=true)

INSERT INTO public.gw_course_assignments (
  course_id,
  title,
  description,
  assignment_type,
  points,
  due_date,
  is_published,
  allow_late_submissions,
  late_penalty_percent,
  display_order
)
SELECT
  ga.course_id,
  ga.title,
  ga.description,
  ga.assignment_type,
  ga.points,
  ga.due_at AS due_date,
  true AS is_published,
  true AS allow_late_submissions,
  0 AS late_penalty_percent,
  ROW_NUMBER() OVER (ORDER BY ga.due_at NULLS LAST, ga.created_at NULLS LAST) AS display_order
FROM public.gw_assignments ga
WHERE ga.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
  AND (ga.is_active IS NULL OR ga.is_active = true)
  AND NOT EXISTS (
    SELECT 1
    FROM public.gw_course_assignments gca
    WHERE gca.course_id = ga.course_id
      AND gca.title = ga.title
  );