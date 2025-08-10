BEGIN;

-- Ensure the user-files bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can view their own files in user-files
DO $$
BEGIN
  CREATE POLICY "User-files: users can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Authenticated users can upload to their own folder in user-files
DO $$
BEGIN
  CREATE POLICY "User-files: users can upload to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Authenticated users can update their own files in user-files
DO $$
BEGIN
  CREATE POLICY "User-files: users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Authenticated users can delete their own files in user-files
DO $$
BEGIN
  CREATE POLICY "User-files: users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;