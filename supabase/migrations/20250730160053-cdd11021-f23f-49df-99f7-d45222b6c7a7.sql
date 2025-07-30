-- Create storage policies for marked-scores bucket

-- Users can upload marked scores
CREATE POLICY "Users can upload marked scores" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'marked-scores' AND 
  (
    -- Users can upload to their own folder or admins can upload anywhere
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    (EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ))
  )
);

-- Users can view marked scores they have access to
CREATE POLICY "Users can view marked scores" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'marked-scores' AND 
  (
    -- Users can view their own files or files shared with them via marked scores table
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    (EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )) OR
    (EXISTS (
      SELECT 1 FROM gw_marked_scores ms
      JOIN gw_sheet_music sm ON sm.id = ms.music_id
      WHERE ms.file_url LIKE '%' || name || '%'
      AND user_can_access_sheet_music(sm.id, auth.uid())
    ))
  )
);

-- Users can update their own marked score files
CREATE POLICY "Users can update their marked scores" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'marked-scores' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    (EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ))
  )
);

-- Users can delete their own marked score files
CREATE POLICY "Users can delete their marked scores" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'marked-scores' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    (EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ))
  )
);