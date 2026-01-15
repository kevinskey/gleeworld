-- Create a calendar for LH 100 and add events
INSERT INTO gw_calendars (id, name, color, is_visible, created_at)
VALUES ('a0000000-0000-0000-0000-000000000100', 'LH 100 - Bowman Scholars', '#8B5CF6', true, now())
ON CONFLICT (id) DO NOTHING;

-- Create calendar events for LH 100 sessions
INSERT INTO gw_events (title, start_date, end_date, category, event_type, is_public, course_id, calendar_id)
SELECT 
  title,
  start_at,
  end_at,
  'academic',
  'class',
  false,
  course_id,
  'a0000000-0000-0000-0000-000000000100'::uuid
FROM gw_course_sessions 
WHERE course_id = 'a0000000-0000-0000-0000-000000000100';