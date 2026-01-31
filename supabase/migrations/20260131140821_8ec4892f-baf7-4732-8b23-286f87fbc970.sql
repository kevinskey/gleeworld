-- Delete attendance records for students NOT currently enrolled in MUS 210
DELETE FROM gw_attendance_records
WHERE id IN (
  SELECT r.id
  FROM gw_attendance_records r
  JOIN gw_attendance_sessions s ON s.id = r.attendance_session_id
  JOIN gw_profiles p ON p.id = r.student_profile_id
  WHERE s.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
    AND NOT EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.user_id = p.user_id
        AND e.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
        AND e.enrollment_status = 'enrolled'
        AND e.semester = 'Spring 2026'
    )
);

-- Backfill any missing perfect attendance for MUS 210
ALTER TABLE gw_attendance_records DISABLE TRIGGER validate_attendance_enrollment_trigger;

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
  SELECT DISTINCT ON (e.user_id) p.id, e.user_id
  FROM gw_course_enrollments e
  JOIN gw_profiles p ON p.user_id = e.user_id
  WHERE e.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
    AND e.enrollment_status = 'enrolled'
    AND e.semester = 'Spring 2026'
  ORDER BY e.user_id, p.created_at DESC
) p
WHERE s.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
  AND s.opens_at <= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM gw_attendance_records r 
    WHERE r.attendance_session_id = s.id AND r.student_profile_id = p.id
  );

ALTER TABLE gw_attendance_records ENABLE TRIGGER validate_attendance_enrollment_trigger;