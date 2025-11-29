-- Ensure course-materials bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Allow authenticated users to upload to course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to course-materials" ON storage.objects;

-- Create RLS policies for course-materials bucket
CREATE POLICY "Allow authenticated users to upload to course-materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-materials');

CREATE POLICY "Allow public access to course-materials"  
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-materials');