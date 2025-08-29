-- Check if bucket exists and fix RLS policies for mus240-resources bucket
-- First, ensure the bucket exists (this will do nothing if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mus240-resources', 'mus240-resources', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated users to upload MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view MUS 240 resources" ON storage.objects;

-- Create comprehensive storage policies for the mus240-resources bucket
CREATE POLICY "mus240_upload_policy"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_view_policy"
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_public_view_policy"
ON storage.objects FOR SELECT 
TO anon
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_update_policy"
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "mus240_delete_policy"
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'mus240-resources');