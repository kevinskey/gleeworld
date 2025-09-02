-- First, create the assignments with proper UUIDs
INSERT INTO mus240_assignments (id, title, description, due_date, is_active, created_at) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Listening Journal 1: Traditional Ewe Music', 'Write a reflective journal entry about traditional Ewe music from West Africa, focusing on rhythm, call-and-response, and cultural significance.', '2025-09-15 23:59:59+00', true, now()),
  ('550e8400-e29b-41d4-a716-446655440001', 'Listening Journal 2', 'Second listening journal assignment', '2025-09-30 23:59:59+00', true, now())
ON CONFLICT (id) DO NOTHING;

-- Update existing journal entries to reference the new UUID assignments
UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440000'::uuid 
WHERE assignment_id = 'lj1';

UPDATE mus240_journal_entries 
SET assignment_id = '550e8400-e29b-41d4-a716-446655440001'::uuid 
WHERE assignment_id = 'lj2';

-- Also add an assignment_db_id column to link back if needed
UPDATE mus240_journal_entries 
SET assignment_db_id = '550e8400-e29b-41d4-a716-446655440000'::uuid 
WHERE assignment_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;