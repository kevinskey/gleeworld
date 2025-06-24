
-- Add delete policy for W9 forms storage bucket
CREATE POLICY "Users can delete their own W9 forms" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'w9-forms' AND auth.uid()::text = (storage.foldername(name))[1]);
