-- Sync LH 100 enrollees to bowman_scholars table
-- Pull existing profile data from gw_profiles where available

INSERT INTO bowman_scholars (user_id, full_name, major, grad_year, bio, headshot_url, course_id, created_at)
SELECT 
  e.user_id,
  COALESCE(p.full_name, CONCAT(p.first_name, ' ', p.last_name)) as full_name,
  p.major,
  p.graduation_year as grad_year,
  p.bio,
  COALESCE(p.headshot_url, p.avatar_url) as headshot_url,
  'a0000000-0000-0000-0000-000000000100' as course_id,
  NOW() as created_at
FROM gw_course_enrollments e
LEFT JOIN gw_profiles p ON e.user_id = p.user_id
WHERE e.course_id = 'a0000000-0000-0000-0000-000000000100'
  AND e.enrollment_status = 'enrolled'
  AND e.user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  full_name = COALESCE(EXCLUDED.full_name, bowman_scholars.full_name),
  major = COALESCE(EXCLUDED.major, bowman_scholars.major),
  grad_year = COALESCE(EXCLUDED.grad_year, bowman_scholars.grad_year),
  bio = COALESCE(EXCLUDED.bio, bowman_scholars.bio),
  headshot_url = COALESCE(EXCLUDED.headshot_url, bowman_scholars.headshot_url),
  course_id = 'a0000000-0000-0000-0000-000000000100';