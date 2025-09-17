-- Update the mus240-resources bucket to allow video files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/mpeg',
  'audio/wav', 
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/aac',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/quicktime',
  'application/pdf',
  'text/xml',
  'application/xml'
]
WHERE id = 'mus240-resources';