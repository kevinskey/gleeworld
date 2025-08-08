-- Add ALL images from various tables into the main media library with categories

-- Add hero slide images
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
  created_by as uploaded_by,
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
  is_featured as is_featured
FROM public.alumnae_stories 
WHERE image_url IS NOT NULL 
AND image_url NOT LIKE '%unsplash%'  -- Skip external stock photos
ON CONFLICT DO NOTHING;

-- Add contract template headers
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
  name as title,
  'Contract template header image' as description,
  header_image_url as file_url,
  'contracts/' || id::text as file_path,
  'image/jpeg' as file_type,
  300000 as file_size,
  'contracts' as category,
  created_by as uploaded_by,
  false as is_public,  -- Contract headers should be private
  false as is_featured
FROM public.contract_templates 
WHERE header_image_url IS NOT NULL 
ON CONFLICT DO NOTHING;

-- Add glee history images
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
  description as description,
  image_url as file_url,
  'history/' || id::text as file_path,
  'image/jpeg' as file_type,
  500000 as file_size,
  'history' as category,
  NULL as uploaded_by,  -- Historical images may not have a specific uploader
  true as is_public,
  true as is_featured
FROM public.glee_history 
WHERE image_url IS NOT NULL 
ON CONFLICT DO NOTHING;