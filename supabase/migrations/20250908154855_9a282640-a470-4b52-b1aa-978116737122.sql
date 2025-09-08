-- Create assignment-submissions storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions', 
  'assignment-submissions', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'];

-- Create RLS policies for assignment submissions storage
-- Allow public read access to assignment submissions
CREATE POLICY "Public read access for assignment submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-submissions');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload assignment submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own submissions (before grading)
CREATE POLICY "Users can update their own submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow instructors/admins to delete submissions if needed
CREATE POLICY "Instructors can delete assignment submissions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-submissions' 
  AND (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);