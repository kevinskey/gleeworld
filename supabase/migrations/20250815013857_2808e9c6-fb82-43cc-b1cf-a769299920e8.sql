-- Create storage bucket for sheet music files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sheet-music', 'sheet-music', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sheet music bucket
CREATE POLICY "Users can upload their own sheet music files"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'sheet-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own sheet music files"
ON storage.objects FOR SELECT 
USING (bucket_id = 'sheet-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sheet music files"
ON storage.objects FOR UPDATE 
USING (bucket_id = 'sheet-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sheet music files"
ON storage.objects FOR DELETE 
USING (bucket_id = 'sheet-music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to access all sheet music files
CREATE POLICY "Admins can access all sheet music files"
ON storage.objects FOR ALL 
USING (bucket_id = 'sheet-music' AND EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));