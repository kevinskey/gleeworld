-- Create storage bucket for MUS 240 resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('mus240-resources', 'mus240-resources', true);

-- Create RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload MUS 240 resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mus240-resources');

CREATE POLICY "Allow authenticated users to view MUS 240 resources"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "Allow authenticated users to update MUS 240 resources"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mus240-resources');

CREATE POLICY "Allow authenticated users to delete MUS 240 resources"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mus240-resources');

-- Allow public access to view files
CREATE POLICY "Allow public to view MUS 240 resources"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'mus240-resources');

-- Add file-related columns to mus240_resources table
ALTER TABLE mus240_resources 
ADD COLUMN file_path TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_size INTEGER,
ADD COLUMN mime_type TEXT,
ADD COLUMN is_file_upload BOOLEAN DEFAULT FALSE;