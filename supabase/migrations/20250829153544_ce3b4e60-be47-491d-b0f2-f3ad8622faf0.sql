-- Clear all existing storage policies for mus240-resources and recreate properly
DROP POLICY IF EXISTS "mus240_resources_select" ON storage.objects;
DROP POLICY IF EXISTS "mus240_resources_insert" ON storage.objects;
DROP POLICY IF EXISTS "mus240_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "mus240_resources_delete" ON storage.objects;

-- Create simple, broad storage policies for the mus240-resources bucket that should work
CREATE POLICY "mus240_bucket_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_bucket_authenticated_write" 
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_bucket_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated  
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_bucket_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mus240-resources');