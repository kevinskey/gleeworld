-- Copy existing audio archive content to media library
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
  is_featured,
  created_at
)
SELECT 
  aa.title,
  aa.description,
  aa.audio_url as file_url,
  'audio/' || REPLACE(LOWER(aa.title), ' ', '_') || '.mp3' as file_path,
  CASE 
    WHEN aa.audio_url LIKE '%.mp3' THEN 'audio/mpeg'
    WHEN aa.audio_url LIKE '%.wav' THEN 'audio/wav'
    WHEN aa.audio_url LIKE '%.ogg' THEN 'audio/ogg'
    ELSE 'audio/mpeg'
  END as file_type,
  COALESCE(aa.duration_seconds * 1000, 1000000) as file_size, -- Estimate size based on duration
  COALESCE(aa.category, 'performance') as category,
  aa.created_by as uploaded_by,
  COALESCE(aa.is_public, true) as is_public,
  false as is_featured,
  aa.created_at
FROM public.audio_archive aa
WHERE aa.audio_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.gw_media_library ml 
  WHERE ml.file_url = aa.audio_url
);