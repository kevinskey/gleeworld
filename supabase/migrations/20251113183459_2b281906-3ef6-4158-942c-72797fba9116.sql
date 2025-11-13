-- Migrate MUS 240 assignments to the unified grading system

-- Insert MUS 240 assignments into gw_assignments for the MUS-240 course
INSERT INTO gw_assignments (
  id,
  course_id,
  legacy_source,
  legacy_id,
  title,
  description,
  assignment_type,
  points,
  due_at,
  is_active,
  created_by,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid,
  'mus240',
  ma.id::text,
  ma.title,
  COALESCE(ma.description, ma.prompt),
  ma.assignment_type,
  ma.points,
  ma.due_date,
  ma.is_active,
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5'::uuid,
  ma.created_at,
  ma.updated_at
FROM mus240_assignments ma
WHERE NOT EXISTS (
  SELECT 1 FROM gw_assignments 
  WHERE legacy_source = 'mus240' AND legacy_id = ma.id::text
);