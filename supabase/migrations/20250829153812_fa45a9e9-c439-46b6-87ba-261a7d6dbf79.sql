-- Completely reset the mus240-resources bucket configuration
-- First, remove the bucket if it exists
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

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for this bucket
DROP POLICY IF EXISTS "mus240_bucket_public_read" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_write" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_delete" ON storage.objects;

-- Create comprehensive policies for the mus240-resources bucket
CREATE POLICY "mus240_resources_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mus240-resources');