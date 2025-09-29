-- Insert MUS 240 enrollments for existing students
INSERT INTO public.mus240_enrollments (
  student_id, semester, enrollment_status, enrolled_at, created_at, updated_at
)
VALUES 
  ('35d4211c-c1d9-415f-983f-a14de5312c0f', 'Fall 2025', 'enrolled', '2024-08-20'::timestamp with time zone, now(), now()),
  ('547181d2-d917-4eb8-baf7-725de2f518f2', 'Fall 2025', 'enrolled', '2024-08-20'::timestamp with time zone, now(), now()),
  ('a672ab8e-ded5-4ec6-aba8-9d2f4eeb063a', 'Fall 2025', 'enrolled', '2024-08-20'::timestamp with time zone, now(), now()),
  ('7d5e4cf2-aaf6-47f4-a5b3-2448df7c7c69', 'Fall 2025', 'enrolled', '2024-08-20'::timestamp with time zone, now(), now())
ON CONFLICT (student_id, semester) DO NOTHING;