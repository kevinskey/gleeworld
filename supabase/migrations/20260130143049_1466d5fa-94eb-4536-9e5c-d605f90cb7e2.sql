-- Enroll Maria Maxie Whitfield in MUS 070 to grant playlist access
INSERT INTO gw_course_enrollments (
  course_id,
  user_id,
  role,
  enrollment_status,
  enrolled_at,
  semester
) VALUES (
  'a0000000-0000-0000-0000-000000000070',
  '96d0f845-cd24-4685-b0be-343decfd32c0',
  'student',
  'enrolled',
  NOW(),
  'Spring 2026'
) ON CONFLICT (course_id, user_id) DO UPDATE SET
  enrollment_status = 'enrolled',
  updated_at = NOW();