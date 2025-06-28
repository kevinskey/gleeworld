
-- Let's also fix the storage policies to allow anonymous uploads
DROP POLICY IF EXISTS "Allow users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow guest users to view W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete any W9 forms" ON storage.objects;

-- Create the w9-forms bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'w9-forms', 
  'w9-forms', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to w9-forms bucket
CREATE POLICY "Anyone can upload W9 forms to storage" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'w9-forms');

-- Allow users to view their own W9 forms (authenticated users only)
CREATE POLICY "Users can view their own W9 forms in storage" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  (auth.uid() IS NOT NULL AND auth.uid()::text = split_part(name, '/', 1))
);

-- Allow admins to view all W9 forms
CREATE POLICY "Admins can view all W9 forms in storage" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);
