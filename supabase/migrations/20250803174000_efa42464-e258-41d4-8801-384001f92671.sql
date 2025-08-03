-- Create lovable-uploads storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lovable-uploads', 
  'lovable-uploads', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create policy to allow public access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'lovable-uploads');

-- Create policy to allow uploads
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'lovable-uploads');