-- Fix MUS 240 sessions: class is 50 minutes (1:00-1:50 PM ET = 18:00-18:50 UTC)
-- Some sessions were incorrectly set to close at 19:15 UTC (2:15 PM ET)
UPDATE gw_attendance_sessions
SET closes_at = opens_at + INTERVAL '50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND closes_at::time = '19:15:00';