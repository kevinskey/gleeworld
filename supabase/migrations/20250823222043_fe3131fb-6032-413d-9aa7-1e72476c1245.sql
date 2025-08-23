-- Create storage bucket for sheet music
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sheet-music', 
  'sheet-music', 
  false, -- Private bucket for security
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- Create storage bucket for study scores  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-scores', 
  'study-scores', 
  true, -- Public for easier access
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- RLS policies for sheet-music bucket (private)
CREATE POLICY "Authenticated users can view sheet music" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'sheet-music');

CREATE POLICY "Admins can insert sheet music" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update sheet music" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete sheet music" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'sheet-music' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS policies for study-scores bucket (public)
CREATE POLICY "Anyone can view study scores" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'study-scores');

CREATE POLICY "Users can insert their own study scores" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'study-scores' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own study scores" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'study-scores' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own study scores" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'study-scores' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);