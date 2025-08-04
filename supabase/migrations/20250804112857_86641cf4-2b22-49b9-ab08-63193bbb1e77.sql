-- Update all rehearsal events to have a default rehearsal image
UPDATE gw_events 
SET image_url = '/images/rehearsal-default.jpg'
WHERE event_type = 'rehearsal' 
AND (image_url IS NULL OR image_url = '');

-- Also update any events that might have rehearsal in the title
UPDATE gw_events 
SET image_url = '/images/rehearsal-default.jpg'
WHERE (title ILIKE '%rehearsal%' OR description ILIKE '%rehearsal%')
AND event_type != 'rehearsal'
AND (image_url IS NULL OR image_url = '');