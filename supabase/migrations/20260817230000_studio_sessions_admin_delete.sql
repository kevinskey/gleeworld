-- Studio: let tenant staff delete studio sessions, not just the owner.
--
-- studio_sessions_read (20260624010000) already lets admins/instructors
-- see every session in the tenant, so the Studio home lists sessions the
-- viewer does not own — but DELETE was owner-only, so the delete button
-- failed on those rows with "Delete was blocked by access policy". The
-- tenant_isolation_restrict RESTRICTIVE policy still applies, so staff
-- can only ever delete sessions inside their current tenant.

CREATE POLICY studio_sessions_delete_staff
  ON gw_studio_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );

-- Matching storage policy: without this, an admin delete removes the DB
-- row but the manifest + audio objects under studio/<tenant_id>/... are
-- orphaned (deleteSession treats storage cleanup as non-fatal, so the
-- failure is only a console warning).

CREATE POLICY studio_bucket_staff_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'studio'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );
