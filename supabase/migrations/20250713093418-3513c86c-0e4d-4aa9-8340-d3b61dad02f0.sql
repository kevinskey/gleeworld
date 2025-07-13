-- Create storage bucket for sheet music PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sheet-music', 'sheet-music', true);

-- Create storage policies for sheet music bucket
CREATE POLICY "Sheet music files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sheet-music');

CREATE POLICY "Admins can upload sheet music files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sheet-music' 
  AND (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
);

CREATE POLICY "Admins can update sheet music files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sheet-music' 
  AND (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
);

CREATE POLICY "Admins can delete sheet music files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sheet-music' 
  AND (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
);