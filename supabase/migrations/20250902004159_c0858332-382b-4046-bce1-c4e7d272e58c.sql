-- Insert sample enrollments for existing journal entries (students who have already submitted journals)
INSERT INTO public.mus240_enrollments (user_id, semester, enrolled_at, status)
SELECT DISTINCT 
  student_id,
  'Fall 2024',
  '2024-08-15 00:00:00+00'::timestamp with time zone,
  'active'
FROM public.mus240_journal_entries 
WHERE student_id IS NOT NULL
ON CONFLICT (user_id, semester) DO NOTHING;