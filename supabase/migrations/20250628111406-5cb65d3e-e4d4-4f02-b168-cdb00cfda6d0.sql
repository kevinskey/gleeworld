
-- Update storage policies to allow anonymous users to upload W9 forms
DROP POLICY IF EXISTS "Allow authenticated users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous users to upload W9 forms" ON storage.objects;

-- Allow both authenticated and anonymous users to upload W9 forms
CREATE POLICY "Allow users to upload W9 forms" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'w9-forms'
);

-- Update the guest policy to be more permissive for anonymous uploads
DROP POLICY IF EXISTS "Allow guest users to view W9 forms" ON storage.objects;
CREATE POLICY "Allow guest users to view W9 forms" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  (auth.uid() IS NULL OR auth.uid()::text = split_part(name, '/', 1))
);

-- Also update the w9_forms table policy to make user_id nullable work properly
ALTER TABLE public.w9_forms ALTER COLUMN user_id DROP NOT NULL;
