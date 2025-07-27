-- Update all events in the Spelman calendar to use the official Spelman logo
UPDATE gw_events 
SET image_url = '/lovable-uploads/67720b4d-800a-4271-8f7a-ce41d51b225e.png'
WHERE calendar_id = '931a4ae9-2a06-4111-a217-59083632b1a3';