-- Delete MUS 210 attendance records with orphaned student_profile_id (no matching profile)
DELETE FROM gw_attendance_records
WHERE id IN (
  SELECT r.id
  FROM gw_attendance_records r
  JOIN gw_attendance_sessions s ON s.id = r.attendance_session_id
  LEFT JOIN gw_profiles p ON p.id = r.student_profile_id
  WHERE s.course_id = '2026c613-bda7-487a-a5d9-91e57c26a741'
    AND p.id IS NULL
);