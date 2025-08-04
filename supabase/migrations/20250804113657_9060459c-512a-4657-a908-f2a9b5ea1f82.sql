-- Update rehearsal events to be public so they show on the landing page
UPDATE gw_events 
SET is_public = true 
WHERE event_type = 'rehearsal' OR title ILIKE '%rehearsal%';