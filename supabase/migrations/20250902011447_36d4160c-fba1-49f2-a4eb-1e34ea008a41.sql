-- Create the missing assignments that journal entries are referencing
INSERT INTO mus240_assignments (id, title, description, due_date, is_active, created_at) 
VALUES 
  ('lj1', 'Listening Journal 1: Traditional Ewe Music', 'Write a reflective journal entry about traditional Ewe music from West Africa, focusing on rhythm, call-and-response, and cultural significance.', '2025-09-15 23:59:59+00', true, now()),
  ('lj2', 'Listening Journal 2', 'Second listening journal assignment', '2025-09-30 23:59:59+00', true, now())
ON CONFLICT (id) DO NOTHING;