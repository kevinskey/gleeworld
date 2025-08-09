-- Create 'sheet-music' storage bucket if it doesn't exist and set public read access
-- Bucket creation
INSERT INTO storage.buckets (id, name, public)
VALUES ('sheet-music', 'sheet-music', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'sheet-music'
-- Allow public read access to objects in the 'sheet-music' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public can read sheet-music'
  ) THEN
    CREATE POLICY "Public can read sheet-music"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'sheet-music');
  END IF;
END $$;

-- Allow authenticated users to upload to the 'sheet-music' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Authenticated can upload to sheet-music'
  ) THEN
    CREATE POLICY "Authenticated can upload to sheet-music"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'sheet-music'
    );
  END IF;
END $$;

-- Allow owners to update/delete their own files in 'sheet-music'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Owners can update sheet-music files'
  ) THEN
    CREATE POLICY "Owners can update sheet-music files"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'sheet-music' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'sheet-music' AND owner = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Owners can delete sheet-music files'
  ) THEN
    CREATE POLICY "Owners can delete sheet-music files"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'sheet-music' AND owner = auth.uid());
  END IF;
END $$;
