-- Fix MUS 240 attendance sessions: shift Tuesday sessions to Monday
UPDATE gw_attendance_sessions
SET 
  opens_at = opens_at - interval '1 day',
  closes_at = CASE WHEN closes_at IS NOT NULL THEN closes_at - interval '1 day' ELSE NULL END,
  title = REPLACE(title, 'Tuesday', 'Monday')
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND extract(dow from opens_at::date) = 2;

-- Fix corresponding calendar events for MUS 240 on Tuesdays
UPDATE gw_events
SET 
  start_date = start_date - interval '1 day',
  end_date = end_date - interval '1 day'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND extract(dow from start_date::date) = 2;

-- Delete any attendance sessions that now land on MLK Day (Jan 19)
DELETE FROM gw_attendance_sessions
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND opens_at::date = '2026-01-19';