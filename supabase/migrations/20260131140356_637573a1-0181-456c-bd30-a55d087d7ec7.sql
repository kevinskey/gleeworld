-- Delete attendance records for students NOT currently enrolled in MUS 070
DELETE FROM gw_attendance_records
WHERE id IN (
  SELECT r.id
  FROM gw_attendance_records r
  JOIN gw_attendance_sessions s ON s.id = r.attendance_session_id
  JOIN gw_profiles p ON p.id = r.student_profile_id
  WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
    AND NOT EXISTS (
      SELECT 1 FROM gw_course_enrollments e
      WHERE e.user_id = p.user_id
        AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
        AND e.enrollment_status = 'enrolled'
        AND e.semester = 'Spring 2026'
    )
);