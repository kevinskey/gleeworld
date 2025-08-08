-- Add ALL images with correct column references

-- Add hero slide images (without created_by since it doesn't exist)
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
  COALESCE(title, 'Hero Slide Image') as title,
  'Hero carousel image' as description,
  image_url as file_url,
  'hero/' || id::text as file_path,
  'image/jpeg' as file_type,
  800000 as file_size,
  'hero' as category,
  NULL as uploaded_by,  -- No creator info available
  true as is_public,
  true as is_featured
FROM public.gw_hero_slides 
WHERE image_url IS NOT NULL 
AND image_url NOT LIKE '%unsplash%'  -- Skip external stock photos
ON CONFLICT DO NOTHING;

-- Add alumnae story images  
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
  'Alumnae story image' as description,
  image_url as file_url,
  'alumnae/' || id::text as file_path,
  'image/jpeg' as file_type,
  600000 as file_size,
  'alumnae' as category,
  user_id as uploaded_by,
  true as is_public,
  COALESCE(is_featured, false) as is_featured
FROM public.alumnae_stories 
WHERE image_url IS NOT NULL 
AND image_url NOT LIKE '%unsplash%'  -- Skip external stock photos
ON CONFLICT DO NOTHING;