-- supabase/migrations/20260811233500_storage_drop_select_all_and_sensitive_personal_docs.sql
--
-- PLATFORM-WIDE STORAGE CHANGE. Kept in its own file, separate from the
-- Documents feature's own migrations, so a reviewer can read, question or
-- veto it in isolation: it drops a policy that predates the Documents work
-- and affects every bucket.
--
-- ---------------------------------------------------------------------------
-- (a) `personal-docs` must be a sensitive bucket
-- ---------------------------------------------------------------------------
-- 20260811233000 exempts `personal-docs` from tenant_isolation_restrict (the
-- bucket is user-scoped, so no tenant_id value would be correct). Exempting a
-- bucket from the RESTRICTIVE rule unmasks whatever the PERMISSIVE side
-- already grants — the exact sequence documented in
-- 20260718180000_personal_scores_tenant_exempt.sql, where lifting tenant
-- isolation for personal-scores revealed that `storage_auth_select`
--
--   (NOT is_sensitive_bucket(bucket_id)) OR owner = auth.uid()
--     OR owner_id = auth.uid()::text OR is_current_user_admin_or_super_admin()
--
-- matched its first branch for ANY authenticated user. A personal document
-- library (essays, drafts, whatever a student pastes into it) is at least as
-- private as personal-scores, so add it to is_sensitive_bucket(); the policy
-- then falls through to `owner = auth.uid()`, matching the bucket's own
-- personal_docs_images_* policies.
--
-- ---------------------------------------------------------------------------
-- (b) Drop `storage_select_all` — a confirmed cross-tenant read hole
-- ---------------------------------------------------------------------------
-- `storage_select_all` was created by
-- 20250804124514_25d7020b-6b85-40c2-8004-6b983d683c01.sql as
--
--   CREATE POLICY "storage_select_all" ON storage.objects
--     FOR SELECT TO authenticated USING (true);
--
-- alongside `storage_insert_auth`/`storage_update_auth`/`storage_delete_auth`,
-- which are all scoped to bucket_id = 'user-files'. The SELECT one is not: it
-- allows every authenticated user to read every object in every bucket.
--
-- 20260610200000_storage_objects_lockdown.sql removed the equivalent blanket
-- grant (`auth_full`) and replaced it with the scoped storage_auth_* family
-- precisely to stop that. It missed `storage_select_all`, which had been
-- sitting under a different name since 2025 — so the lockdown's SELECT half
-- never actually took effect. PERMISSIVE policies OR together, so
-- `USING (true)` overrides storage_auth_select, every per-bucket tenant-scoped
-- read policy, and both follow-ups that tightened is_sensitive_bucket()
-- (20260808300000, 20260808310000). This is the "over-broad permissive grant
-- [that] still exists and still deserves an audit" flagged in
-- 20260806210000_songwriting_storage_tenant_by_path.sql, and the confirmed
-- finding that any signed-in user could read every tenant's studio and
-- parttrack files.
--
-- WHAT ACTUALLY CHANGES. Only reads of buckets in is_sensitive_bucket():
-- w9-forms, id-documents, signed-contracts, contract-documents,
-- contract-signatures, tour-contracts, budget-documents, receipts,
-- excuse-documents, executive-board-files, hair-nail-photos,
-- performer-documents, personal-scores, studio, studio-video, parttrack,
-- songwriting, and now personal-docs. For every other bucket
-- storage_auth_select already grants exactly what storage_select_all granted
-- (`NOT is_sensitive_bucket(...)` → true), so dropping this policy is a no-op
-- there. tenant_isolation_restrict still ANDs on top, unchanged. Writes are
-- untouched. service_role (service_full) is untouched.
--
-- Reads of sensitive buckets now require owner = auth.uid(), owner_id =
-- auth.uid()::text, admin/super-admin, or a matching per-bucket policy
-- (studio/studio-video/parttrack keep their tenant-scoped read policies, so
-- intra-tenant collaboration is preserved — see 20260808300000).
--
-- This restores the clear intent of the 2026-06-10 lockdown rather than
-- introducing a new restriction.
--
-- Safe to re-run: CREATE OR REPLACE + DROP POLICY IF EXISTS.

-- Guarded read-back: refuse to clobber an is_sensitive_bucket() that someone
-- else has narrowed since 20260808310000. Checked by content rather than exact
-- text so comments/formatting don't trip it.
DO $$
DECLARE
  v_src      text;
  v_expected text[] := ARRAY[
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents', 'personal-scores',
    'studio', 'studio-video', 'parttrack', 'songwriting'
  ];
  v_bucket   text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_sensitive_bucket';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'public.is_sensitive_bucket() not found — inspect before re-running; this migration will not invent it.';
  END IF;

  FOREACH v_bucket IN ARRAY v_expected LOOP
    IF position('''' || v_bucket || '''' in v_src) = 0 THEN
      RAISE EXCEPTION 'is_sensitive_bucket() no longer lists %; it has been changed since 20260808310000. Inspect before re-running. Found: %', v_bucket, v_src;
    END IF;
  END LOOP;
END $$;

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
    'studio', 'studio-video', 'parttrack',
    'songwriting',
    -- Added 2026-08-11. Personal document library (Documents word processor).
    -- The gw_personal_docs table is owner-only; this stops the in-document
    -- images being readable by anyone holding a path. Required because
    -- 20260811233000 exempts this bucket from tenant_isolation_restrict.
    'personal-docs'
  )
$function$;

COMMENT ON FUNCTION public.is_sensitive_bucket(text) IS
  'Buckets that storage_auth_select must NOT open to every authenticated user. '
  'Three kinds: genuinely confidential documents; tenant-scoped media whose own '
  'per-bucket policies do the scoping (studio, studio-video, parttrack); and '
  'per-USER buckets (personal-scores, personal-docs, songwriting). Referenced '
  'only by storage_auth_select.';

-- The hole itself. See the header block above for what does and does not
-- change; every non-sensitive bucket keeps identical read access through
-- storage_auth_select.
DROP POLICY IF EXISTS "storage_select_all" ON storage.objects;
