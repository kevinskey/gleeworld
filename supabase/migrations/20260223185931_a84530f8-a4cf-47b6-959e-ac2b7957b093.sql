-- Enroll Ainka-Amara's other accounts in MUS-240
-- She has 3 accounts with email variations that don't all normalize to the same value
-- ainka-amara.williams@ (enrolled), ainkaamarawilliams@ (matches via normalization), ainkaaamarawilliams@ (does NOT match - extra 'a')
INSERT INTO gw_course_enrollments (course_id, user_id, enrollment_status, semester, role)
VALUES 
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '1d57da77-8738-4151-8ae8-486c6e41c229', 'enrolled', 'Spring 2026', 'student'),
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '04f14d47-25ba-4632-9d4e-2407d2c3797b', 'enrolled', 'Spring 2026', 'student')
ON CONFLICT DO NOTHING;