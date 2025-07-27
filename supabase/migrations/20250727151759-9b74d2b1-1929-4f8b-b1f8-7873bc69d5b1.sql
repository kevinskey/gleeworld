-- Update all events in the Spelman calendar to use the new Spelman logo
UPDATE gw_events 
SET image_url = '/src/assets/spelman-college-logo.jpg'
WHERE calendar_id = '931a4ae9-2a06-4111-a217-59083632b1a3';