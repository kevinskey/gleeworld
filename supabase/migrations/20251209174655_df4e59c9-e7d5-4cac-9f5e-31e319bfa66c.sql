-- Create storage bucket for social posts media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-posts',
  'social-posts',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to social-posts bucket
CREATE POLICY "Authenticated users can upload social posts media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-posts');

-- Allow public read access to social posts media
CREATE POLICY "Public read access for social posts media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-posts');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own social posts media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-posts' AND auth.uid()::text = (storage.foldername(name))[1]);