-- Backfill MUS 070 (Glee Club) attendance to 100% present for sessions before January 28, 2026
-- This matches the policy applied to MUS 240

INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, note)
SELECT 
  s.id as attendance_session_id,
  e.user_id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  'Retroactive attendance - backfilled per policy (100% present before Jan 28)' as note
FROM gw_attendance_sessions s
CROSS JOIN gw_course_enrollments e
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'  -- MUS 070
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.semester = 'Spring 2026'
  AND e.enrollment_status = 'enrolled'
  AND e.user_id IS NOT NULL
  AND s.opens_at::date < '2026-01-28'
ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;