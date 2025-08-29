-- Fix storage RLS and bucket policies for mus240-resources
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Ensure the mus240-resources bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mus240-resources', 'mus240-resources', true, 52428800, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop all existing policies for mus240-resources to start fresh
DROP POLICY IF EXISTS "mus240_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_public_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "mus240_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete MUS 240 resources" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view MUS 240 resources" ON storage.objects;

-- Create comprehensive storage policies for the mus240-resources bucket
CREATE POLICY "MUS240 Resources - Public View"
ON storage.objects FOR SELECT 
TO anon, authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "MUS240 Resources - Authenticated Upload"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "MUS240 Resources - Admin Manage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'mus240-resources' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Also ensure RLS policies exist for the mus240_resources table
-- Enable RLS on mus240_resources table
ALTER TABLE public.mus240_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mus240_resources table
DROP POLICY IF EXISTS "MUS240 Resources - Public Read" ON public.mus240_resources;
DROP POLICY IF EXISTS "MUS240 Resources - Admin Manage" ON public.mus240_resources;

CREATE POLICY "MUS240 Resources - Public Read"
ON public.mus240_resources FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "MUS240 Resources - Admin Manage"
ON public.mus240_resources FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);