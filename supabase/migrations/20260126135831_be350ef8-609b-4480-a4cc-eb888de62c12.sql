
-- Mark all students as present for all sessions before January 28th, 2026
-- This gives everyone 100% attendance up to that point

INSERT INTO gw_attendance_records (
  attendance_session_id,
  student_profile_id,
  status,
  check_in_method,
  marked_at,
  note
)
SELECT 
  s.id as attendance_session_id,
  e.student_id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  NOW() as marked_at,
  'Retroactive attendance - all students marked present' as note
FROM gw_attendance_sessions s
CROSS JOIN gw_enrollments e
WHERE s.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND e.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND s.opens_at::date < '2026-01-28'
ON CONFLICT (attendance_session_id, student_profile_id) 
DO UPDATE SET 
  status = 'present',
  check_in_method = 'manual',
  marked_at = NOW(),
  note = 'Retroactive attendance - all students marked present';
