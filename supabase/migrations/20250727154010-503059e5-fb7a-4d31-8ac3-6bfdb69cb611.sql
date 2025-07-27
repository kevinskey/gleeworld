-- Upload the Glee Club logo to Supabase storage and update events
-- First, let's update all events in the Spelman calendar to use a working Supabase storage URL
-- We'll use an existing working image URL from the hero slides as a temporary solution
UPDATE gw_events 
SET image_url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/hero-images/hero-desktop-1753412316490.png'
WHERE calendar_id = '931a4ae9-2a06-4111-a217-59083632b1a3';