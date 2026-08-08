-- Close a confirmed cross-tenant read hole in storage.
--
-- MEASURED on prod 2026-08-08: one authenticated user could see ALL 82 objects
-- in the `studio` bucket, spanning 5 different tenants — 52 of them belonging
-- to other organisations. These are DAW projects and practice recordings.
--
-- MECHANISM. Two policies that are each reasonable alone:
--
--   storage_auth_select (TO authenticated) allows a read when
--     (NOT is_sensitive_bucket(bucket_id)) OR owner = uid()
--       OR owner_id = uid()::text OR is_current_user_admin_or_super_admin()
--
--   is_sensitive_bucket() listed 13 buckets — contracts, W-9s, receipts,
--   personal-scores — but NOT studio, studio-video or parttrack.
--
-- Permissive policies OR together, so that blanket "not sensitive → allow"
-- overrode the narrow per-bucket policies which already scope by tenant:
--
--   studio_bucket_tenant_read       foldername[1] = current_tenant_id() OR owner = uid()
--   studio_video_tenant_read        same
--   parttrack_bucket_tenant_read    gw_is_member_of_tenant_path(foldername[1])
--
-- Those three are also exempt from the RESTRICTIVE tenant_isolation_restrict
-- policy (storage.objects.tenant_id is stamped by the storage API without the
-- caller's tenant context, so it is unreliable for them). With the restrictive
-- rule waived and storage_auth_select saying yes, nothing scoped them at all.
--
-- FIX. Add the three buckets to is_sensitive_bucket(). storage_auth_select then
-- falls through to `owner = uid()`, and the per-bucket policies above resume
-- doing the tenant scoping they were written to do.
--
-- Deliberately surgical: is_sensitive_bucket() is referenced by exactly one
-- policy (storage_auth_select) and no other function, verified against
-- pg_policy and pg_proc. Nothing else changes behaviour.
--
-- INTRA-TENANT COLLABORATION IS PRESERVED. All three per-bucket policies grant
-- reads to others in the same tenant, so bandmates keep seeing each other's
-- studio projects and part tracks. Only cross-tenant access is removed.
--
-- NOT INCLUDED: `songwriting`. It has the same shape, but its per-bucket policy
-- is owner-only (foldername[1] = current_tenant_id() AND owner = uid()), so
-- adding it here would also stop tenant-mates reading a SHARED song's
-- recordings. gw_songs has a visibility column, so sharing is a real feature and
-- that needs its own look. Cross-tenant access to songwriting is already blocked
-- by 20260806210000_songwriting_storage_tenant_by_path.sql.
--
-- Safe to re-run: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.is_sensitive_bucket(p_bucket_id text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_bucket_id IN (
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents', 'personal-scores',
    -- Added 2026-08-08. Not "sensitive" in the HR/legal sense the original list
    -- describes, but they must not be world-readable by every signed-in user
    -- across every tenant. Their own policies scope them by tenant; this stops
    -- storage_auth_select overriding that.
    'studio', 'studio-video', 'parttrack'
  )
$function$;

COMMENT ON FUNCTION public.is_sensitive_bucket(text) IS
  'Buckets that storage_auth_select must NOT open to every authenticated user. '
  'Two kinds: genuinely confidential documents, and tenant-scoped media whose '
  'own per-bucket policies do the scoping (studio, studio-video, parttrack). '
  'Referenced only by storage_auth_select.';
