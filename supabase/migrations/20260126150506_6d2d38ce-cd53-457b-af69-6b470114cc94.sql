-- Create attendance sessions for MUS-070 (Glee Club) Spring 2026
-- Rehearsals are Tuesday/Thursday 5:00-7:00 PM

-- Delete any existing sessions for MUS-070 to start fresh
DELETE FROM gw_attendance_sessions WHERE course_id = 'a0000000-0000-0000-0000-000000000070';

-- Create sessions for Spring 2026 semester 
INSERT INTO gw_attendance_sessions (course_id, title, opens_at, closes_at, status)
VALUES
  -- Week 1 (Jan 12-16)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-13T17:00:00-05:00', '2026-01-13T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-15T17:00:00-05:00', '2026-01-15T19:00:00-05:00', 'open'),
  -- Week 2 (Jan 19-23)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-20T17:00:00-05:00', '2026-01-20T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-22T17:00:00-05:00', '2026-01-22T19:00:00-05:00', 'open'),
  -- Week 3 (Jan 26-30)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-27T17:00:00-05:00', '2026-01-27T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-01-29T17:00:00-05:00', '2026-01-29T19:00:00-05:00', 'open'),
  -- Week 4 (Feb 2-6)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-03T17:00:00-05:00', '2026-02-03T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-05T17:00:00-05:00', '2026-02-05T19:00:00-05:00', 'open'),
  -- Week 5 (Feb 9-13)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-10T17:00:00-05:00', '2026-02-10T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-12T17:00:00-05:00', '2026-02-12T19:00:00-05:00', 'open'),
  -- Week 6 (Feb 16-20)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-17T17:00:00-05:00', '2026-02-17T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-19T17:00:00-05:00', '2026-02-19T19:00:00-05:00', 'open'),
  -- Week 7 (Feb 23-27)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-24T17:00:00-05:00', '2026-02-24T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-02-26T17:00:00-05:00', '2026-02-26T19:00:00-05:00', 'open'),
  -- Week 8 (Mar 2-6)
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-03-03T17:00:00-05:00', '2026-03-03T19:00:00-05:00', 'open'),
  ('a0000000-0000-0000-0000-000000000070', 'Rehearsal', '2026-03-05T17:00:00-05:00', '2026-03-05T19:00:00-05:00', 'open');

-- Mark enrolled students (with valid user_id) as present for sessions before Jan 28, 2026
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
  e.user_id as student_profile_id,
  'present' as status,
  'manual' as check_in_method,
  NOW() as marked_at,
  'Retroactive attendance - all students marked present' as note
FROM gw_attendance_sessions s
CROSS JOIN gw_course_enrollments e
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.enrollment_status = 'enrolled'
  AND e.user_id IS NOT NULL
  AND s.opens_at::date < '2026-01-28'
ON CONFLICT (attendance_session_id, student_profile_id) 
DO UPDATE SET 
  status = 'present',
  note = 'Retroactive attendance - all students marked present';