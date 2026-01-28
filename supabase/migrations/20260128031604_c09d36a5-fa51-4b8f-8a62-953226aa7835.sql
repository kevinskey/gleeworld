-- Remove duplicate "Rehearsal" sessions that are not part of the official MWF schedule
-- Keep only the properly titled MUS 070 sessions
DELETE FROM gw_attendance_sessions 
WHERE course_id = 'a0000000-0000-0000-0000-000000000070' 
AND title = 'Rehearsal';