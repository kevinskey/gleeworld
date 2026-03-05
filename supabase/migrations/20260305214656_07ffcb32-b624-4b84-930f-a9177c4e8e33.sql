-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', true, 26214400)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Public read access
CREATE POLICY "Public read access for message attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'message-attachments');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[2] IS NOT NULL);