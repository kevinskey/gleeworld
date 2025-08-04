-- Update the local image paths to use a proper placeholder image from Unsplash
UPDATE gw_events 
SET image_url = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
WHERE image_url = '/images/rehearsal-default.jpg';