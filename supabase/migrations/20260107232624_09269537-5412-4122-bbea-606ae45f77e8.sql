-- Create storage bucket for conducting video submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conducting-videos',
  'conducting-videos', 
  true,
  104857600, -- 100MB limit for video files
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own conducting videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'conducting-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own videos
CREATE POLICY "Users can view their own conducting videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'conducting-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own conducting videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'conducting-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own conducting videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'conducting-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins/instructors to view all videos for grading
CREATE POLICY "Admins can view all conducting videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'conducting-videos'
  AND EXISTS (
    SELECT 1 FROM app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'instructor')
    AND is_active = true
  )
);