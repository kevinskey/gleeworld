-- Create AI Group Project Role Identification Assignment
INSERT INTO gw_assignments (
  id,
  course_id,
  title,
  description,
  assignment_type,
  category,
  points,
  due_at,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid,
  'AI Group Project - Role Identification',
  'Identify your specific contributions to the AI Group Project across the five graded areas: Creativity, Technology, Writing, Presentation, and Research. Select all areas where you made significant contributions and provide specific details about your work.',
  'project',
  'group_project',
  50,
  '2024-12-15 23:59:59+00'::timestamptz,
  true,
  NOW(),
  NOW()
);