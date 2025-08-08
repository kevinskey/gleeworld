-- Copy existing sheet music PDFs to media library
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
  sm.title,
  CONCAT('Sheet music: ', sm.title, 
    CASE WHEN sm.composer IS NOT NULL THEN CONCAT(' by ', sm.composer) ELSE '' END,
    CASE WHEN sm.arranger IS NOT NULL THEN CONCAT(' (arr. ', sm.arranger, ')') ELSE '' END
  ) as description,
  sm.pdf_url as file_url,
  'pdfs/sheet-music/' || REPLACE(LOWER(sm.title), ' ', '_') || '.pdf' as file_path,
  'application/pdf' as file_type,
  2000000 as file_size, -- Estimate 2MB per PDF
  'sheet-music' as category,
  sm.created_by as uploaded_by,
  COALESCE(sm.is_public, true) as is_public,
  false as is_featured,
  sm.created_at
FROM public.gw_sheet_music sm
WHERE sm.pdf_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.gw_media_library ml 
  WHERE ml.file_url = sm.pdf_url
);