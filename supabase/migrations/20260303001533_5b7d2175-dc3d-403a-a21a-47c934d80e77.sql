
-- Enroll 4 existing users in MUS 070
INSERT INTO public.gw_course_enrollments (course_id, user_id, role, enrollment_status, semester)
VALUES
  ('a0000000-0000-0000-0000-000000000070', 'a891b8d0-1c5b-4af7-97ca-e762177ee6f2', 'student', 'enrolled', 'Spring 2026'),
  ('a0000000-0000-0000-0000-000000000070', 'aea7103b-28f9-4532-82c1-c4c143e824f8', 'student', 'enrolled', 'Spring 2026'),
  ('a0000000-0000-0000-0000-000000000070', '5d2e4026-1d6d-4ecd-a71e-934b9f486979', 'student', 'enrolled', 'Spring 2026'),
  ('a0000000-0000-0000-0000-000000000070', 'e7d54ce0-b284-48e3-86e2-468afc649d98', 'student', 'enrolled', 'Spring 2026')
ON CONFLICT DO NOTHING;

-- Add 4 existing users to tour roster (tour_id NULL like existing records)
INSERT INTO public.gw_tour_roster (user_id, status)
VALUES
  ('a891b8d0-1c5b-4af7-97ca-e762177ee6f2', 'confirmed'),
  ('aea7103b-28f9-4532-82c1-c4c143e824f8', 'confirmed'),
  ('5d2e4026-1d6d-4ecd-a71e-934b9f486979', 'confirmed'),
  ('e7d54ce0-b284-48e3-86e2-468afc649d98', 'confirmed')
ON CONFLICT DO NOTHING;
