-- storage.objects carries a RESTRICTIVE tenant_isolation_restrict policy:
--   (bucket_id = 'site-branding') OR (tenant_id = current_tenant_id())
-- RESTRICTIVE policies AND with every permissive policy, so an object whose
-- own tenant_id is NULL is unreadable by ANYONE except service_role.
--
-- Every object in `personal-scores` has tenant_id NULL, because a personal
-- library is USER-scoped by design — it deliberately follows the person
-- across tenants. The result was that personal scores could never be opened
-- in the browser at all: the owner's own read was denied by tenant isolation
-- before the owner policy was ever consulted.
--
-- Exempt the bucket from tenant isolation, the same way site-branding already
-- is. Access is still fully governed by the PERMISSIVE policies on this
-- bucket, which are strictly user/tenant scoped:
--   * personal_scores_bucket_read  — owner only (path prefix = auth.uid())
--   * "tenant members read published personal scores" — only while a
--     gw_sheet_music row in the reader's tenant references the object
-- so this widens nothing beyond what those two already allow.

DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.objects;

CREATE POLICY tenant_isolation_restrict ON storage.objects
AS RESTRICTIVE
USING (
  bucket_id IN ('site-branding', 'personal-scores')
  OR tenant_id = public.current_tenant_id()
)
WITH CHECK (
  bucket_id IN ('site-branding', 'personal-scores')
  OR tenant_id = public.current_tenant_id()
);

-- Exempting the bucket above unmasked a pre-existing hole: the blanket
-- `storage_auth_select` policy reads
--   (NOT is_sensitive_bucket(bucket_id)) OR owner = auth.uid() OR is_admin...
-- and personal-scores was not in that list, so ANY authenticated user matched
-- the first branch. Tenant isolation had been hiding that only by accident
-- (NULL tenant_id denied everyone, including the owner).
--
-- A personal library is at least as private as the other per-user buckets, so
-- add it to the sensitive list. storage_auth_select then requires ownership,
-- and cross-tenant reads flow solely through the published-score policy.
CREATE OR REPLACE FUNCTION public.is_sensitive_bucket(p_bucket_id text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_bucket_id IN (
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents', 'personal-scores'
  )
$function$;
