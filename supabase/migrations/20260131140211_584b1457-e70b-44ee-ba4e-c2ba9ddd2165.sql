
-- Backfill perfect attendance for all enrolled students across all courses
-- Using 'manual' as check_in_method (valid value per constraint)
INSERT INTO gw_attendance_records (
  attendance_session_id,
  student_profile_id,
  status,
  check_in_method,
  marked_at,
  note
)
SELECT DISTINCT
  s.id as attendance_session_id,
  p.id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  s.opens_at as marked_at,
  'Perfect attendance backfill - January 2026' as note
FROM gw_attendance_sessions s
JOIN gw_courses c ON c.id = s.course_id
JOIN gw_course_enrollments e ON e.course_id = s.course_id AND e.enrollment_status = 'enrolled'
JOIN gw_profiles p ON p.user_id = e.user_id
WHERE s.opens_at <= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM gw_attendance_records r 
    WHERE r.attendance_session_id = s.id AND r.student_profile_id = p.id
  );
