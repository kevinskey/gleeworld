-- Insert MUS 240 enrollments for existing students
INSERT INTO public.mus240_enrollments (
  student_id, semester, enrollment_status, enrolled_at, created_at, updated_at
)
SELECT 
  gp.user_id,
  'Fall 2025',
  'enrolled',
  '2024-08-20'::timestamp with time zone,
  now(),
  now()
FROM public.gw_profiles gp 
WHERE gp.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.mus240_enrollments me 
    WHERE me.student_id = gp.user_id 
    AND me.semester = 'Fall 2025'
  );