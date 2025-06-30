
-- Ensure the w9-forms storage bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'w9-forms', 
  'w9-forms', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- Drop all existing storage policies for w9-forms to start fresh
DROP POLICY IF EXISTS "Anyone can upload W9 forms to storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own W9 forms in storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all W9 forms in storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow guest users to view W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete any W9 forms" ON storage.objects;

-- Create universal upload policy that allows anyone (authenticated or guest) to upload
CREATE POLICY "Universal W9 upload policy" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'w9-forms');

-- Allow users to view their own files (authenticated users only)
CREATE POLICY "Users can view their own W9 files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  (auth.uid() IS NOT NULL AND auth.uid()::text = split_part(name, '/', 1))
);

-- Allow admins to view all W9 files
CREATE POLICY "Admins can view all W9 files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own W9 files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'w9-forms' AND 
  (auth.uid() IS NOT NULL AND auth.uid()::text = split_part(name, '/', 1))
);

-- Allow admins to delete any W9 files
CREATE POLICY "Admins can delete any W9 files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'w9-forms' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);
