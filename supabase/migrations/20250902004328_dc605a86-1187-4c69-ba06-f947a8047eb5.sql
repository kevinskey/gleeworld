-- Insert sample enrollments for existing journal entries using correct column names
INSERT INTO public.mus240_enrollments (student_id, semester, enrolled_at, enrollment_status)
SELECT DISTINCT 
  student_id,
  'Fall 2024',
  '2024-08-15 00:00:00+00'::timestamp with time zone,
  'active'
FROM public.mus240_journal_entries 
WHERE student_id IS NOT NULL
ON CONFLICT (student_id, semester) DO NOTHING;