-- Backfill perfect attendance for MUS 240 (23 enrolled students, Spring 2026)
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
  WHERE e.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
    AND e.enrollment_status = 'enrolled'
    AND e.semester = 'Spring 2026'
  ORDER BY e.user_id, p.created_at DESC
) p
WHERE s.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND s.opens_at <= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM gw_attendance_records r 
    WHERE r.attendance_session_id = s.id AND r.student_profile_id = p.id
  );