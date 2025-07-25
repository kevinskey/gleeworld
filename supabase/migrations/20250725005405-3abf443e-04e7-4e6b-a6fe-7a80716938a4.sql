-- Create storage policies for user-files bucket to allow public access to dashboard backgrounds

-- Policy to allow public viewing of dashboard backgrounds
CREATE POLICY "Public access to dashboard backgrounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-files' AND storage.foldername(name)[1] = 'dashboard-backgrounds');

-- Policy to allow authenticated users to upload dashboard backgrounds
CREATE POLICY "Authenticated users can upload dashboard backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-files' AND auth.uid() IS NOT NULL AND storage.foldername(name)[1] = 'dashboard-backgrounds');

-- Policy to allow authenticated users to update dashboard backgrounds
CREATE POLICY "Authenticated users can update dashboard backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-files' AND auth.uid() IS NOT NULL AND storage.foldername(name)[1] = 'dashboard-backgrounds');

-- Policy to allow authenticated users to delete dashboard backgrounds  
CREATE POLICY "Authenticated users can delete dashboard backgrounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-files' AND auth.uid() IS NOT NULL AND storage.foldername(name)[1] = 'dashboard-backgrounds');