-- supabase/migrations/20260811233000_personal_docs_storage_exempt.sql
-- Documents word processor: make the `personal-docs` bucket usable at all.
--
-- 20260811230000_personal_docs.sql created a private `personal-docs` bucket
-- with four owner-scoped PERMISSIVE policies. Those policies are correct, and
-- they are also irrelevant on their own: storage.objects carries a
-- RESTRICTIVE policy, tenant_isolation_restrict, which ANDs with every
-- permissive policy. Its current definition (20260806210000) is
--
--   (bucket_id = ANY (ARRAY['site-branding','personal-scores','studio',
--                           'studio-video','parttrack']))
--   OR (bucket_id = 'songwriting' AND foldername(name)[1] = current_tenant_id()::text)
--   OR (tenant_id = current_tenant_id())
--
-- `personal-docs` is on neither list, so every read and write of a document
-- image must satisfy storage.objects.tenant_id = current_tenant_id().
--
-- That column is stamped by the storage API at upload time, in a context that
-- does not carry the caller's x-tenant-slug, so it is unreliable for anything
-- the storage API writes — that is precisely why the five buckets above are
-- exempt (parttrack has 45 objects with tenant_id NULL and works only by
-- being on the list). For `personal-docs` it is worse than unreliable: a
-- personal document library is USER-scoped by design, deliberately following
-- the person across tenants (gw_personal_docs has no tenant_id at all — see
-- 20260811230000), so there is no tenant value that would be correct.
--
-- This is exactly the bug personal-scores hit, diagnosed and fixed by
-- 20260718180000_personal_scores_tenant_exempt.sql: the owner's own read was
-- denied by tenant isolation before the owner policy was ever consulted, and
-- personal scores could never be opened in the browser.
--
-- WHAT THIS DOES. Adds 'personal-docs' to the exempt array. Unlike
-- `songwriting` (whose tenancy is re-derived from the object path, because a
-- songwriting object genuinely belongs to a tenant), there is no path-based
-- alternative here: the key layout is <user_id>/<doc_id>/<uuid>.<ext> and the
-- owning entity is the USER. Access stays fully governed by the bucket's four
-- permissive policies, each of which requires
-- (storage.foldername(name))[1] = auth.uid()::text — owner only.
--
-- Widening the restrictive rule for a bucket also unmasks whatever the
-- PERMISSIVE side already allows platform-wide; for personal-docs that is
-- handled by the companion migration
-- 20260811233500_storage_drop_select_all_and_sensitive_personal_docs.sql,
-- which must be applied together with this one.
--
-- Safe to re-run: guarded read-back, then drop + recreate.

DO $$
DECLARE
  v_expected text := '((bucket_id = ANY (ARRAY[''site-branding''::text, ''personal-scores''::text, ''studio''::text, ''studio-video''::text, ''parttrack''::text])) OR ((bucket_id = ''songwriting''::text) AND ((storage.foldername(name))[1] = (current_tenant_id())::text)) OR (tenant_id = current_tenant_id()))';
  v_actual   text;
BEGIN
  SELECT pg_get_expr(polqual, polrelid) INTO v_actual
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polname = 'tenant_isolation_restrict';

  IF v_actual IS NULL THEN
    RAISE EXCEPTION 'tenant_isolation_restrict not found on storage.objects — inspect before re-running; this migration will not invent a policy.';
  END IF;

  -- Already applied (or superseded by something that kept personal-docs):
  -- nothing to guard against, fall through to the idempotent recreate.
  IF position('personal-docs' in v_actual) = 0 THEN
    -- Compare whitespace-insensitively: pg_get_expr's rendering is stable, but
    -- a stray formatting difference must not be treated as tampering.
    IF regexp_replace(v_actual, '\s+', '', 'g') <> regexp_replace(v_expected, '\s+', '', 'g') THEN
      RAISE EXCEPTION 'tenant_isolation_restrict does not match the expected definition. Found: %', v_actual;
    END IF;
  END IF;
END $$;

DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.objects;

CREATE POLICY tenant_isolation_restrict ON storage.objects
  AS RESTRICTIVE FOR ALL TO public
  USING (
    -- Buckets whose tenancy is enforced by path in their own permissive
    -- policies. storage.objects.tenant_id is not reliable for these.
    -- personal-docs is USER-scoped rather than tenant-scoped (like
    -- personal-scores): its permissive policies require
    -- foldername(name)[1] = auth.uid()::text.
    (bucket_id = ANY (ARRAY[
      'site-branding', 'personal-scores', 'studio', 'studio-video', 'parttrack',
      'personal-docs'
    ]))
    -- songwriting: same situation, but tenancy is still ENFORCED here, derived
    -- from the key layout <tenant_id>/<user_id>/<song_id>/<file>, instead of
    -- being waived. This is why songwriting is not simply added to the array.
    OR (
      bucket_id = 'songwriting'
      AND (storage.foldername(name))[1] = (current_tenant_id())::text
    )
    -- Everything else keeps the original column-based check.
    OR (tenant_id = current_tenant_id())
  );

COMMENT ON POLICY tenant_isolation_restrict ON storage.objects IS
  'Tenant isolation for storage. Buckets in the exempt array enforce tenancy (or, '
  'for the personal-* buckets, per-USER ownership) via their own path-based '
  'permissive policies, because storage.objects.tenant_id is stamped by the '
  'storage API without the caller''s tenant context. songwriting is NOT exempt: '
  'its tenancy is enforced here from foldername(name)[1].';
