-- Correct SELECT policy to compare UUID owner to auth.uid()
DO $$
BEGIN
  -- Drop existing incorrect policy if it was partially created (unlikely since previous migration failed before creation)
  -- Create or replace the policy with correct UUID comparison
  CREATE OR REPLACE POLICY "Owners can view their own marked-scores objects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'marked-scores' AND owner = auth.uid()
  );
END$$;