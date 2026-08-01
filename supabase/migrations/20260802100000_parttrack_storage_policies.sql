-- The private `parttrack` bucket shipped without per-bucket storage.objects
-- policies, so authenticated signed-URL creation failed with "Object not
-- found" (the worker's service key bypasses RLS, which is why renders
-- uploaded fine). Pattern follows the songwriting/personal-scores buckets.
--
-- Paths: stems/mixes live under <tenant_id>/<score_id>/..., so tenant
-- isolation falls out of the first path folder. Browser uploads go to
-- uploads/<uuid>/source.<ext> and are only ever read back by the worker.

DROP POLICY IF EXISTS parttrack_bucket_tenant_read ON storage.objects;
CREATE POLICY parttrack_bucket_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'parttrack'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS parttrack_bucket_upload_write ON storage.objects;
CREATE POLICY parttrack_bucket_upload_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'parttrack'
    AND (storage.foldername(name))[1] = 'uploads'
  );
