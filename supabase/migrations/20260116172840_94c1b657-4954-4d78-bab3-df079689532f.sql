-- Sync existing active MUS-240 assignments to gw_course_assignments
INSERT INTO gw_course_assignments (id, course_id, title, description, instructions, assignment_type, points, due_date, is_published, created_at, updated_at)
SELECT 
  id,
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid as course_id,
  title,
  description,
  prompt as instructions,
  assignment_type,
  points,
  due_date,
  is_active as is_published,
  created_at,
  updated_at
FROM mus240_assignments
WHERE is_active = true
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  assignment_type = EXCLUDED.assignment_type,
  points = EXCLUDED.points,
  due_date = EXCLUDED.due_date,
  is_published = EXCLUDED.is_published,
  updated_at = EXCLUDED.updated_at;