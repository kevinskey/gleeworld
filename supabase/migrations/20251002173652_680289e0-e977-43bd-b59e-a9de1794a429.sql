-- Create course-materials bucket for educational PDFs and documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true);

-- Allow public read access to course materials
CREATE POLICY "Anyone can view course materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

-- Allow admins to upload course materials
CREATE POLICY "Admins can upload course materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to update course materials
CREATE POLICY "Admins can update course materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-materials' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to delete course materials
CREATE POLICY "Admins can delete course materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-materials' 
  AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);