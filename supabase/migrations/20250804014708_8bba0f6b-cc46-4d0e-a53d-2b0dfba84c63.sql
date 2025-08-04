-- Add the historic campus image to the media library
INSERT INTO public.gw_media_library (
  title,
  description,
  file_url,
  file_path,
  file_type,
  file_size,
  category,
  tags,
  is_public,
  uploaded_by
) VALUES (
  'Historic Campus View - Spelman College',
  'Beautiful black and white historic photograph of Spelman College campus showing classical architecture with columns and brick buildings, circa early 20th century',
  '/lovable-uploads/65bf7ca4-6247-46a0-9f8c-3ead6ddf148e.png',
  'lovable-uploads/65bf7ca4-6247-46a0-9f8c-3ead6ddf148e.png',
  'image/png',
  850000,
  'historic',
  ARRAY['spelman', 'campus', 'historic', 'architecture', 'black-white', 'columns', 'buildings'],
  true,
  (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
);