-- Update existing student profiles with names from the MUS240 roster
-- and ensure they're enrolled in MUS240 Fall 2025

-- Update existing students with names from the provided list
UPDATE public.gw_profiles 
SET 
  full_name = 'Devin N. Gorham',
  first_name = 'Devin',
  last_name = 'Gorham',
  email = 'devin.gorham@spelman.edu',
  academic_year = 'sophomore',
  major = 'Music',
  updated_at = now()
WHERE user_id = '7d5e4cf2-aaf6-47f4-a5b3-2448df7c7c69' AND role = 'student';

UPDATE public.gw_profiles 
SET 
  full_name = 'Caitlyn Oppong',
  first_name = 'Caitlyn', 
  last_name = 'Oppong',
  email = 'caitlyn.oppong@spelman.edu',
  academic_year = 'junior',
  major = 'Music Education',
  updated_at = now()
WHERE user_id = '35d4211c-c1d9-415f-983f-a14de5312c0f' AND role = 'student';

UPDATE public.gw_profiles 
SET 
  full_name = 'Karrington Adams',
  first_name = 'Karrington',
  last_name = 'Adams', 
  email = 'karrington.adams@spelman.edu',
  academic_year = 'freshman',
  major = 'Music',
  updated_at = now()
WHERE user_id = '547181d2-d917-4eb8-baf7-725de2f518f2' AND role = 'student';

UPDATE public.gw_profiles 
SET 
  full_name = 'Maya J. Draughn',
  first_name = 'Maya',
  last_name = 'Draughn',
  email = 'maya.draughn@spelman.edu',
  academic_year = 'sophomore',
  major = 'Music',
  updated_at = now()
WHERE user_id = 'a672ab8e-ded5-4ec6-aba8-9d2f4eeb063a' AND role = 'student';

-- Ensure all these students are enrolled in MUS240 Fall 2025
INSERT INTO public.mus240_enrollments (
  student_id, semester, enrollment_status, enrolled_at, created_at, updated_at
)
SELECT 
  user_id,
  'Fall 2025',
  'enrolled',
  '2024-08-20'::timestamp with time zone,
  now(),
  now()
FROM public.gw_profiles 
WHERE role = 'student'
  AND user_id IN (
    '7d5e4cf2-aaf6-47f4-a5b3-2448df7c7c69',
    '35d4211c-c1d9-415f-983f-a14de5312c0f', 
    '547181d2-d917-4eb8-baf7-725de2f518f2',
    'a672ab8e-ded5-4ec6-aba8-9d2f4eeb063a'
  )
ON CONFLICT (student_id, semester) DO UPDATE SET
  enrollment_status = 'enrolled',
  updated_at = now();