-- Create the mus240-resources bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mus240-resources', 'mus240-resources', true, 52428800, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public access to files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'mus240-resources');

CREATE POLICY "Allow authenticated users to update files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');