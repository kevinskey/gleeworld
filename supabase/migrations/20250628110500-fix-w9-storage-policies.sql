
-- Create the w9-forms storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'w9-forms', 
  'w9-forms', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated users to upload W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all W9 forms" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own W9 forms" ON storage.objects;

-- Allow authenticated users to upload W9 forms
CREATE POLICY "Allow authenticated users to upload W9 forms" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'w9-forms' AND 
  auth.uid() IS NOT NULL
);

-- Allow users to view their own W9 forms (path starts with their user ID)
CREATE POLICY "Allow users to view their own W9 forms" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

-- Allow admins to view all W9 forms
CREATE POLICY "Allow admins to view all W9 forms" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'w9-forms' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Allow users to delete their own W9 forms
CREATE POLICY "Allow users to delete their own W9 forms" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'w9-forms' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

-- Allow admins to delete any W9 forms
CREATE POLICY "Allow admins to delete any W9 forms" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'w9-forms' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Also ensure the w9_forms table has proper RLS policies for guest users
DROP POLICY IF EXISTS "Allow users to manage their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow guest users to submit W9 forms" ON public.w9_forms;

-- Allow authenticated users to manage their own W9 forms
CREATE POLICY "Allow users to manage their own W9 forms" 
ON public.w9_forms 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow guest users to submit W9 forms (insert only, no user_id required)
CREATE POLICY "Allow guest users to submit W9 forms" 
ON public.w9_forms 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Allow admins to view all W9 forms
CREATE POLICY "Allow admins to view all W9 forms" 
ON public.w9_forms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);
