-- Clean up duplicate storage policies for mus240-resources bucket
-- Remove all existing policies to start fresh

DROP POLICY IF EXISTS "mus240_bucket_public_read" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_write" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "mus240_bucket_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "mus240_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_public_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_view_policy" ON storage.objects;

-- Create only the essential policies we need
CREATE POLICY "mus240_resources_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_resources_write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mus240-resources');