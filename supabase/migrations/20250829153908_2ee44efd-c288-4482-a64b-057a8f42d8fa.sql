-- Clear existing files from the mus240-resources bucket first
DELETE FROM storage.objects WHERE bucket_id = 'mus240-resources';

-- Now safely delete and recreate the bucket
DELETE FROM storage.buckets WHERE id = 'mus240-resources';

-- Create the bucket with proper configuration
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
) VALUES (
  'mus240-resources',
  'mus240-resources', 
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- Create simple storage policies for the mus240-resources bucket
CREATE POLICY "mus240_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mus240-resources');