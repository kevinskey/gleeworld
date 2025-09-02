-- Create the mus240-resources storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('mus240-resources', 'mus240-resources', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = now();

-- Create RLS policies for the mus240-resources bucket
-- Allow public read access to all files in the bucket
CREATE POLICY "Public Access for MUS 240 Resources" ON storage.objects
  FOR SELECT USING (bucket_id = 'mus240-resources');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload MUS 240 resources" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update MUS 240 resources" ON storage.objects
  FOR UPDATE USING (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files (for admins)
CREATE POLICY "Authenticated users can delete MUS 240 resources" ON storage.objects
  FOR DELETE USING (bucket_id = 'mus240-resources' AND auth.role() = 'authenticated');