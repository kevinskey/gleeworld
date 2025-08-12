-- Allow creators to generate signed URLs for their own uploads in marked-scores bucket
-- This fixes the chicken-egg problem where SELECT on storage.objects required a gw_marked_scores row first

DO $$
BEGIN
  -- Create SELECT policy allowing authenticated users to select their own storage objects in marked-scores
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Owners can view their own marked-scores objects'
  ) THEN
    CREATE POLICY "Owners can view their own marked-scores objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'marked-scores' AND owner = auth.uid()::text
    );
  END IF;
END$$;

-- Ensure members are allowed to insert marked scores (already exists, but make sure policy remains active)
-- No change needed to INSERT policy since it already permits role IN ('admin','executive','member')
