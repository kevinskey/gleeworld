-- Grant genesis TA access for MUS240
INSERT INTO course_teaching_assistants (user_id, course_code, is_active, notes)
SELECT 
  user_id,
  'MUS240',
  true,
  'TA access granted for grading assignments'
FROM gw_profiles 
WHERE email ILIKE '%genesis%'
ON CONFLICT (user_id, course_code) 
DO UPDATE SET 
  is_active = true,
  updated_at = now(),
  notes = 'TA access re-enabled for grading assignments';