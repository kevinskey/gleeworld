-- Update mus240-resources bucket to allow PowerPoint file types
UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY[
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
WHERE id = 'mus240-resources'
AND NOT (
  allowed_mime_types @> ARRAY['application/vnd.openxmlformats-officedocument.presentationml.presentation']::text[]
);