-- Add missing listening journals to mus240_assignments and gw_assignments

-- First, insert missing listening journals into mus240_assignments with required prompt field
INSERT INTO mus240_assignments (id, title, assignment_type, points, due_date, is_active, created_by, created_at, updated_at, prompt)
VALUES
  ('550e8400-e29b-41d4-a716-446655440004', 'Listening Journal 4', 'listening_journal', 100, '2025-10-31 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Listening Journal 5', 'listening_journal', 100, '2025-11-15 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Listening Journal 6', 'listening_journal', 100, '2025-11-30 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Listening Journal 7', 'listening_journal', 100, '2025-12-15 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Listening Journal 8', 'listening_journal', 100, '2026-01-15 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Listening Journal 9', 'listening_journal', 100, '2026-01-31 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Listening Journal 10', 'listening_journal', 100, '2026-02-15 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Listening Journal 11', 'listening_journal', 100, '2026-02-28 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Listening Journal 12', 'listening_journal', 100, '2026-03-15 23:59:59+00', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', now(), now(), 'Complete listening journal assignment')
ON CONFLICT (id) DO NOTHING;

-- Then, migrate them to gw_assignments
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
WHERE ma.id IN (
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012'
);