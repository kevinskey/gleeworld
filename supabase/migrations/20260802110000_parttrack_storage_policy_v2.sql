-- v1 of the parttrack read policy compared the path's tenant folder to
-- current_tenant_id(), which resolves via the x-tenant-slug REQUEST HEADER
-- in PostgREST calls — a header the Storage API never receives. It then
-- falls back to the user's HOME tenant, which differs from the operating
-- tenant for multi-tenant users, so signed URLs failed with "Object not
-- found". Scope by tenant MEMBERSHIP instead: auth.uid() is the one
-- context storage policies reliably have.

DROP POLICY IF EXISTS parttrack_bucket_tenant_read ON storage.objects;
CREATE POLICY parttrack_bucket_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'parttrack'
    AND EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id::text = (storage.foldername(name))[1]
    )
  );
