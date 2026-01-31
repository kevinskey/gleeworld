-- Clean up: Delete all attendance records for MUS 070 sessions before Jan 28, 2026
-- Then re-insert with correct 69 enrolled students only

-- Step 1: Delete attendance for early sessions (before Jan 28)
DELETE FROM gw_attendance_records
WHERE attendance_session_id IN (
  SELECT id FROM gw_attendance_sessions 
  WHERE course_id = 'a0000000-0000-0000-0000-000000000070'
    AND opens_at < '2026-01-28'
);

-- Step 2: Re-insert perfect attendance for the 69 enrolled students only
-- Using a proper join to get ONE profile per enrolled user
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
  p.id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  s.opens_at as marked_at,
  'Perfect attendance - Spring 2026' as note
FROM gw_attendance_sessions s
CROSS JOIN (
  -- Get exactly one profile per enrolled user
  SELECT DISTINCT ON (e.user_id) 
    p.id, e.user_id
  FROM gw_course_enrollments e
  JOIN gw_profiles p ON p.user_id = e.user_id
  WHERE e.course_id = 'a0000000-0000-0000-0000-000000000070'
    AND e.enrollment_status = 'enrolled'
    AND e.semester = 'Spring 2026'
  ORDER BY e.user_id, p.created_at DESC
) p
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND s.opens_at < '2026-01-28'
  AND NOT EXISTS (
    SELECT 1 FROM gw_attendance_records r 
    WHERE r.attendance_session_id = s.id AND r.student_profile_id = p.id
  );