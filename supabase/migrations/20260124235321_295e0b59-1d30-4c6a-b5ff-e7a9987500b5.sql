-- Normalize all MUS 240 class times to 12:00-12:50 PM ET
-- Before DST (Jan-Mar 8): 12pm ET = 17:00 UTC
-- After DST (Mar 8+): 12pm ET = 16:00 UTC

UPDATE gw_events 
SET 
  start_date = date_trunc('day', start_date) + interval '17 hours',
  end_date = date_trunc('day', end_date) + interval '17 hours 50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
AND start_date < '2026-03-08'::timestamp with time zone;

UPDATE gw_events 
SET 
  start_date = date_trunc('day', start_date) + interval '16 hours',
  end_date = date_trunc('day', end_date) + interval '16 hours 50 minutes'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
AND start_date >= '2026-03-08'::timestamp with time zone;