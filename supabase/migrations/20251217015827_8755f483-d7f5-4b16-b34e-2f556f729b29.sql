-- Create audio-recordings bucket for radio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to radio-uploads folder
CREATE POLICY "Authenticated users can upload radio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-recordings' AND (storage.foldername(name))[1] = 'radio-uploads');

-- Allow public read access
CREATE POLICY "Public read access for audio-recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-recordings');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete radio files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-recordings');