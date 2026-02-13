-- Enroll all missing students from gw_student_profiles into MUS 240
INSERT INTO public.gw_course_enrollments (student_profile_id, user_id, course_id, enrollment_status, semester)
SELECT 
  sp.id as student_profile_id,
  sp.user_id,
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' as course_id,
  'enrolled' as enrollment_status,
  'Spring 2026' as semester
FROM gw_student_profiles sp
LEFT JOIN gw_course_enrollments ce 
  ON (ce.student_profile_id = sp.id OR ce.user_id = sp.user_id) 
  AND ce.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
  AND ce.enrollment_status = 'enrolled'
WHERE ce.id IS NULL
ON CONFLICT DO NOTHING;