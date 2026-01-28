-- Set all course class events to NOT public
UPDATE gw_events 
SET is_public = false
WHERE course_id IS NOT NULL
AND event_type = 'class';

-- Also update any future course events to ensure they're not public
UPDATE gw_events 
SET is_public = false
WHERE course_id IS NOT NULL;