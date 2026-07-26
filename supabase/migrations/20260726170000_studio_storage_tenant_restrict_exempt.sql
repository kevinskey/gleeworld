-- Studio sessions unreadable ("Could not load session") — storage.objects
-- restrictive tenant policy vs. the studio buckets' path-scoped isolation.
--
-- What happened: storage-api validates permissions in the caller's context
-- (where current_tenant_id() resolves the x-tenant-slug header / JWT), but
-- performs the physical INSERT into storage.objects with service-role
-- context, where current_tenant_id() is NULL. trg_set_tenant_id_objects
-- then falls back to the OWNER'S HOME tenant (gw_profiles.tenant_id). For
-- a multi-tenant user (tenant switcher, 2026-07-25) that home tenant can
-- differ from the request tenant, so every studio manifest was stamped
-- with the wrong tenant_id — and tenant_isolation_restrict denied every
-- subsequent read, which storage masks as 400 "Object not found".
--
-- Fix: exempt the path-scoped studio buckets from the tenant_id stamp
-- check, exactly like site-branding / personal-scores already are. Tenant
-- isolation for these buckets is enforced by their own permissive
-- policies, which require the object path's first folder to equal
-- current_tenant_id() (see 20260624010000_studio_sessions.sql /
-- 20260624020000_studio_videos.sql) — the path prefix is authoritative,
-- the stamped column never was.

ALTER POLICY tenant_isolation_restrict ON storage.objects
  USING (
    bucket_id = ANY (ARRAY['site-branding'::text, 'personal-scores'::text, 'studio'::text, 'studio-video'::text])
    OR tenant_id = current_tenant_id()
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY['site-branding'::text, 'personal-scores'::text, 'studio'::text, 'studio-video'::text])
    OR tenant_id = current_tenant_id()
  );

-- Defense in depth: the storage service resolves current_tenant_id() in
-- its own DB session, where header visibility has already proven
-- unreliable — so let an object's OWNER always read and rewrite their
-- own studio files, with the folder check as the cross-user path.
-- (INSERT stays strictly folder-gated: uploads must still land under
-- the request tenant's prefix.)

ALTER POLICY studio_bucket_tenant_read ON storage.objects
  USING (
    bucket_id = 'studio'
    AND ((storage.foldername(name))[1] = (current_tenant_id())::text OR owner = auth.uid())
  );

ALTER POLICY studio_bucket_owner_update ON storage.objects
  USING (bucket_id = 'studio' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'studio' AND owner = auth.uid());

ALTER POLICY studio_bucket_owner_delete ON storage.objects
  USING (bucket_id = 'studio' AND owner = auth.uid());

ALTER POLICY studio_video_tenant_read ON storage.objects
  USING (
    bucket_id = 'studio-video'
    AND ((storage.foldername(name))[1] = (current_tenant_id())::text OR owner = auth.uid())
  );

ALTER POLICY studio_video_owner_update ON storage.objects
  USING (bucket_id = 'studio-video' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'studio-video' AND owner = auth.uid());

ALTER POLICY studio_video_owner_delete ON storage.objects
  USING (bucket_id = 'studio-video' AND owner = auth.uid());

-- Backfill: re-stamp existing studio objects from their (authoritative)
-- path prefix so the column is at least truthful going forward.
UPDATE storage.objects
SET tenant_id = split_part(name, '/', 1)::uuid
WHERE bucket_id IN ('studio', 'studio-video')
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND tenant_id IS DISTINCT FROM split_part(name, '/', 1)::uuid;
