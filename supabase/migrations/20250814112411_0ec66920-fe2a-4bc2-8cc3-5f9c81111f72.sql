-- Create storage bucket for sight-singing recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sight-singing-recordings', 'sight-singing-recordings', false);

-- Create RLS policies for sight-singing recordings bucket
CREATE POLICY "Users can upload their own recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sight-singing-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own recordings" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sight-singing-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own recordings" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sight-singing-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own recordings" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sight-singing-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin access to all recordings
CREATE POLICY "Admins can access all recordings" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'sight-singing-recordings' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);