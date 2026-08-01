-- Final piece of the signed-URL failure: storage.objects carries a
-- RESTRICTIVE policy (tenant_isolation_restrict) that ANDs over every
-- permissive policy: objects must satisfy tenant_id = current_tenant_id()
-- unless their bucket is on the exemption list of buckets whose own
-- per-bucket policies handle scoping (site-branding, personal-scores,
-- studio, studio-video). parttrack objects are uploaded by the worker's
-- service key (tenant_id column unset) and read cross-tenant-context, so
-- parttrack joins the exemption list; isolation is enforced by the
-- membership-based parttrack_bucket_tenant_read policy (v3).

DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.objects;
CREATE POLICY tenant_isolation_restrict ON storage.objects
  AS RESTRICTIVE FOR ALL TO public
  USING (
    bucket_id = ANY (ARRAY[
      'site-branding'::text, 'personal-scores'::text,
      'studio'::text, 'studio-video'::text, 'parttrack'::text
    ])
    OR tenant_id = current_tenant_id()
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY[
      'site-branding'::text, 'personal-scores'::text,
      'studio'::text, 'studio-video'::text, 'parttrack'::text
    ])
    OR tenant_id = current_tenant_id()
  );
