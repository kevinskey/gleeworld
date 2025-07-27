-- Update all events in the Spelman calendar to use the new Glee Club logo
UPDATE gw_events 
SET image_url = '/lovable-uploads/de2db7e1-501d-431a-861f-3a51965c3e7a.png'
WHERE calendar_id = '931a4ae9-2a06-4111-a217-59083632b1a3';