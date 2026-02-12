
-- Remove incorrect MUS 240 enrollment for Rayne Stewart
DELETE FROM public.gw_course_enrollments
WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81'
  AND course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
