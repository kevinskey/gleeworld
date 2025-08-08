-- Move event images into the main media library so they show up
INSERT INTO public.gw_media_library (
  title, 
  description, 
  file_url, 
  file_path, 
  file_type, 
  file_size, 
  category, 
  uploaded_by, 
  is_public, 
  is_featured
)
SELECT 
  title,
  'Event image from events table' as description,
  image_url as file_url,
  'events/' || id::text as file_path,
  'image/jpeg' as file_type,
  500000 as file_size,
  'event' as category,
  created_by as uploaded_by,
  true as is_public,
  false as is_featured
FROM public.gw_events 
WHERE image_url IS NOT NULL 
AND image_url NOT LIKE '%unsplash%'  -- Skip external stock photos
ON CONFLICT DO NOTHING;