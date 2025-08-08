-- Add product images and any other missed images

-- Add product images if they exist
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
  'Product Image' as title,
  'Product/merchandise image' as description,
  image_url as file_url,
  'products/' || id::text as file_path,
  'image/jpeg' as file_type,
  400000 as file_size,
  'products' as category,
  NULL as uploaded_by,
  true as is_public,
  false as is_featured
FROM public.product_images 
WHERE image_url IS NOT NULL 
ON CONFLICT DO NOTHING;