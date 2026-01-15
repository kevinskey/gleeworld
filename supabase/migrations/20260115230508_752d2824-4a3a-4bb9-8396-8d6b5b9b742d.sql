-- Make LH 100 events visible on the main calendar by setting is_public = true
UPDATE gw_events 
SET is_public = true 
WHERE calendar_id = 'a0000000-0000-0000-0000-000000000100';