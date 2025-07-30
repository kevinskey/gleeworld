-- Create comprehensive storage policies for all buckets

-- User Files bucket policies
CREATE POLICY "Allow authenticated users to upload user files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-files');

CREATE POLICY "Allow users to view their own user files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to update their own user files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own user files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- W9 Forms bucket policies
CREATE POLICY "Allow authenticated users to upload w9 forms" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'w9-forms');

CREATE POLICY "Allow users to view their own w9 forms" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'w9-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Product Images bucket policies (public)
CREATE POLICY "Allow public access to product images" ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Allow admins to manage product images" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Sheet Music bucket policies
CREATE POLICY "Allow authenticated users to view sheet music" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'sheet-music');

CREATE POLICY "Allow admins to manage sheet music" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'sheet-music' AND EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Event Images bucket policies (public)
CREATE POLICY "Allow public access to event images" ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Allow admins to manage event images" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'event-images' AND EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Avatars bucket policies (public)
CREATE POLICY "Allow public access to avatars" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Allow users to manage their own avatars" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);