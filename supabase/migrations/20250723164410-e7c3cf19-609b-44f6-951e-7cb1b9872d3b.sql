-- Update storage policies for user-files bucket to handle avatars properly
-- The avatar system uses 'user-files' bucket, not 'avatars' bucket

-- Create policy for viewing avatar files in user-files bucket  
CREATE POLICY "Anyone can view avatar files in user-files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-files' AND (name LIKE 'avatars/%' OR bucket_id = 'user-files'));

-- Create policy for users to upload their own avatar files
CREATE POLICY "Users can upload their own avatar files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-files' 
  AND name LIKE 'avatars/%' 
  AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
);

-- Create policy for users to update their own avatar files  
CREATE POLICY "Users can update their own avatar files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'user-files' 
  AND name LIKE 'avatars/%' 
  AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
);

-- Create policy for users to delete their own avatar files
CREATE POLICY "Users can delete their own avatar files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'user-files' 
  AND name LIKE 'avatars/%' 
  AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
);