-- Create the assignments with all required fields
INSERT INTO mus240_assignments (
  id, 
  title, 
  description, 
  prompt,
  assignment_type,
  points,
  due_date, 
  is_active, 
  created_at,
  updated_at
) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000', 
    'Listening Journal 1: Traditional Ewe Music', 
    'Write a reflective journal entry about traditional Ewe music from West Africa, focusing on rhythm, call-and-response, and cultural significance.',
    'Listen to the provided traditional Ewe music recordings and write a 250+ word journal entry analyzing the musical elements you hear. Focus on rhythm patterns, call-and-response structures, and cultural significance. Reflect on how this music connects to community and cultural identity.',
    'listening_journal',
    100,
    '2025-09-15 23:59:59+00', 
    true, 
    now(),
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001', 
    'Listening Journal 2', 
    'Second listening journal assignment',
    'Listen to the assigned music and write a thoughtful analysis of the musical and cultural elements.',
    'listening_journal',
    100,
    '2025-09-30 23:59:59+00', 
    true, 
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Update existing journal entries to reference the new UUID assignments
UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440000'::uuid 
WHERE assignment_id = 'lj1';

UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440001'::uuid 
WHERE assignment_id = 'lj2';