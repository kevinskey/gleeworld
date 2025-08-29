-- Fix storage policies for mus240-resources bucket  
-- The issue is that we need to properly set up storage policies that work with the current RLS setup

-- First check if we can see storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "MUS240 Resources - Public View" ON storage.objects;
DROP POLICY IF EXISTS "MUS240 Resources - Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "MUS240 Resources - Admin Manage" ON storage.objects;

-- Create simple, working storage policies for the mus240-resources bucket
CREATE POLICY "mus240_resources_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'mus240-resources');

-- Ensure bucket settings are correct
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