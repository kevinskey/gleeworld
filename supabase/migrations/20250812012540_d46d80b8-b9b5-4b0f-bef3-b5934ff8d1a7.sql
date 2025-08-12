-- Ensure policy exists to allow creators to select their own marked-scores objects
DROP POLICY IF EXISTS "Owners can view their own marked-scores objects" ON storage.objects;
CREATE POLICY "Owners can view their own marked-scores objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'marked-scores' AND owner = auth.uid()
);
