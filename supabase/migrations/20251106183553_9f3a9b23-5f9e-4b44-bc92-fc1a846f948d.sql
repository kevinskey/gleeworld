-- Create storage bucket for email template images
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-template-images', 'email-template-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload template images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-template-images');

-- Allow public access to view images
CREATE POLICY "Public access to template images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-template-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own template images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-template-images' AND auth.uid()::text = (storage.foldername(name))[1]);