-- Fix Problem 1: "Monday" sessions with wrong time (10:00 AM ET instead of 1:00 PM ET)
-- Pre-DST (EST, UTC-5): correct UTC is 18:00-18:50
UPDATE gw_attendance_sessions
SET opens_at = date_trunc('day', opens_at) + INTERVAL '18 hours',
    closes_at = date_trunc('day', opens_at) + INTERVAL '18 hours 50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND opens_at::time = '15:00:00'
AND opens_at < '2026-03-08';

-- Post-DST Monday sessions (EDT, UTC-4): correct UTC is 17:00-17:50
UPDATE gw_attendance_sessions
SET opens_at = date_trunc('day', opens_at) + INTERVAL '17 hours',
    closes_at = date_trunc('day', opens_at) + INTERVAL '17 hours 50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND opens_at::time = '14:00:00'
AND opens_at >= '2026-03-08';

-- Fix Problem 2: Post-DST Wed/Fri sessions with 75-min duration (should be 50 min)
-- These open at 17:00 UTC (1 PM EDT) but close at 18:15 instead of 17:50
UPDATE gw_attendance_sessions
SET closes_at = opens_at + INTERVAL '50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND opens_at >= '2026-03-08'
AND (closes_at - opens_at) > INTERVAL '50 minutes';