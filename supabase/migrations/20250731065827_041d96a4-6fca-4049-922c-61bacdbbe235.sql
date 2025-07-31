-- Create media library storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-library', 'media-library', true);

-- Create storage policy for public access to media library
CREATE POLICY "Media library files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media-library');

-- Create policy for authenticated users to upload to media library
CREATE POLICY "Authenticated users can upload to media library" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'media-library' AND auth.role() = 'authenticated');