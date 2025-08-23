-- Check and fix RLS policies for sheet-music bucket
DROP POLICY IF EXISTS "Authenticated users can view sheet music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert sheet music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update sheet music" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete sheet music" ON storage.objects;

-- Create improved RLS policies for sheet-music bucket
CREATE POLICY "Authenticated users can view sheet music files" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'sheet-music');

CREATE POLICY "Admins and librarians can insert sheet music" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'librarian')
  )
);

CREATE POLICY "Admins and librarians can update sheet music" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'librarian')
  )
);

CREATE POLICY "Admins and librarians can delete sheet music" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'librarian')
  )
);

-- Make sure the sheet-music bucket is public for easier access
UPDATE storage.buckets SET public = true WHERE id = 'sheet-music';