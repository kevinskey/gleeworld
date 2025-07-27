-- Update all events in the Spelman calendar to use the new logo
UPDATE gw_events 
SET image_url = '/lovable-uploads/1a103ae2-6b01-4cc0-8439-b8dae90f4829.png'
WHERE calendar_id = '931a4ae9-2a06-4111-a217-59083632b1a3';