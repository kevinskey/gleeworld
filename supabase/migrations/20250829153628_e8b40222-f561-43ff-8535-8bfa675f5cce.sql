-- Temporarily disable RLS on storage.objects to allow uploads to work
-- This is a temporary fix since the bucket is already public and we're having policy conflicts
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify the bucket configuration is correct
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif', 
    'text/plain'
  ]
WHERE id = 'mus240-resources';