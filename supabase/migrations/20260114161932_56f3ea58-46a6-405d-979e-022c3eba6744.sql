-- Insert MUS 240 class sessions into gw_events from gw_course_calendar
-- MUS 240 Calendar ID: 9b0267e7-5b30-4288-b33f-99a056279011
-- MUS 240 Course ID: 23c4ee3c-7bbb-4534-8c0a-eecd88298d37

-- First, delete any existing MUS 240 events to avoid duplicates
DELETE FROM gw_events 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

-- Insert all MUS 240 course calendar events into gw_events
-- Map 'test' event type to 'academic' for events table compatibility
INSERT INTO gw_events (
  id,
  title,
  description,
  event_type,
  start_date,
  end_date,
  location,
  calendar_id,
  course_id,
  is_public,
  is_private,
  status,
  attendance_required,
  created_by,
  created_at
)
SELECT 
  cc.id,
  cc.title,
  cc.description,
  CASE 
    WHEN cc.event_type = 'test' THEN 'academic'
    ELSE COALESCE(cc.event_type, 'class')
  END,
  cc.start_time,
  cc.end_time,
  cc.location,
  '9b0267e7-5b30-4288-b33f-99a056279011', -- MUS 240 calendar
  cc.course_id,
  false, -- Not public (members only)
  true,  -- Private to enrolled students
  'scheduled',
  true, -- Attendance required for class
  'aece359b-a80a-4726-ad75-49ed17fe20d2', -- Valid gw_profiles user
  cc.created_at
FROM gw_course_calendar cc
WHERE cc.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  location = EXCLUDED.location;