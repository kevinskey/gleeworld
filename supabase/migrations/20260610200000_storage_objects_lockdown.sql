-- Replace the storage.objects auth_full policy (ALL/true/true for every
-- authenticated user) with scoped policies. auth_full let any logged-in
-- account — fan, auditioner, anyone — list, download, overwrite, and delete
-- every object in its tenant via the Storage API, including private buckets
-- (w9-forms, id-documents, signed-contracts, budget-documents, receipts,
-- excuse-documents, ...). tenant_isolation_restrict still ANDs with all of
-- these; service_full and the per-bucket policies are unchanged.

CREATE OR REPLACE FUNCTION public.is_sensitive_bucket(p_bucket_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_bucket_id IN (
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_sensitive_bucket(text) TO authenticated, anon;

DROP POLICY IF EXISTS auth_full ON storage.objects;

-- Reads: everything except sensitive buckets, which are owner/admin only.
DROP POLICY IF EXISTS storage_auth_select ON storage.objects;
CREATE POLICY storage_auth_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    NOT public.is_sensitive_bucket(bucket_id)
    OR owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR public.is_current_user_admin_or_super_admin()
  );

-- Uploads: unchanged behavior (any authenticated user, any bucket).
DROP POLICY IF EXISTS storage_auth_insert ON storage.objects;
CREATE POLICY storage_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Overwrite/delete: only the uploader or an admin. Legacy objects with no
-- owner recorded become admin-managed.
DROP POLICY IF EXISTS storage_auth_update ON storage.objects;
CREATE POLICY storage_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR public.is_current_user_admin_or_super_admin()
  )
  WITH CHECK (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR public.is_current_user_admin_or_super_admin()
  );

DROP POLICY IF EXISTS storage_auth_delete ON storage.objects;
CREATE POLICY storage_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR public.is_current_user_admin_or_super_admin()
  );
