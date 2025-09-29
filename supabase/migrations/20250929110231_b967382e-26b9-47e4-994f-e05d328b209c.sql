-- Create the missing Listening Journal 3 assignment
INSERT INTO public.mus240_assignments (
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
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'Listening Journal 3: Ragtime and Scott Joplin',
  'Analyze ragtime music and Scott Joplin''s contributions to American music',
  'Listen to Scott Joplin''s "Maple Leaf Rag" and write a 250-300 word analysis focusing on syncopation, rhythmic complexity, and cultural significance. Discuss how ragtime represented African American musical innovation and cultural expression during the early 1900s.',
  'listening_journal',
  100,
  '2025-10-15 23:59:59+00',
  true,
  NOW(),
  NOW()
);

-- Create a lookup table for assignment shorthand IDs
CREATE TABLE IF NOT EXISTS public.mus240_assignment_codes (
  code TEXT PRIMARY KEY,
  assignment_id UUID REFERENCES public.mus240_assignments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the code mappings
INSERT INTO public.mus240_assignment_codes (code, assignment_id) VALUES
  ('lj1', '550e8400-e29b-41d4-a716-446655440000'),
  ('lj2', '550e8400-e29b-41d4-a716-446655440001'),
  ('lj3', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (code) DO NOTHING;