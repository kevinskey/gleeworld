
-- Enroll Rayne Stewart in MUS 240
INSERT INTO public.gw_course_enrollments (user_id, course_id, enrollment_status, semester)
VALUES ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', '23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'enrolled', 'Spring 2026')
ON CONFLICT DO NOTHING;

-- Fix her display name
UPDATE public.gw_profiles
SET full_name = 'Rayne Stewart', first_name = 'Rayne', last_name = 'Stewart'
WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81';
