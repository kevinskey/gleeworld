-- Songwriting recordings were invisible in the UI: the rows existed in
-- gw_song_recordings and the audio existed in the songwriting bucket, but
-- createSignedUrl returned nothing, so listRecordings() dropped every row and
-- the panel rendered "No recordings yet."
--
-- WHY. storage.objects carries a RESTRICTIVE policy, tenant_isolation_restrict:
--
--   (bucket_id = ANY (ARRAY['site-branding','personal-scores','studio',
--                           'studio-video','parttrack']))
--   OR (tenant_id = current_tenant_id())
--
-- songwriting is not on that exemption list, so its objects must satisfy
-- storage.objects.tenant_id = current_tenant_id(). That column is stamped by
-- the storage API at upload time, in a context that does not carry the caller's
-- x-tenant-slug — so every songwriting object landed with the MAIN tenant's id
-- while the uploader was working in a different tenant. The two never matched
-- and the restrictive policy hid all of them.
--
-- Measured on prod 2026-08-06: 5 objects stamped bb48609d (main) belonging to a
-- user whose current_tenant_id() was 364cc4db. Zero visible. The same query
-- against gw_song_recordings returned all 5 rows — the table side was fine
-- throughout, which is why the insert succeeded and the UI still said "saved."
--
-- The column is unreliable for anything the storage API writes. That is exactly
-- why the other five buckets are exempt: parttrack currently has 45 objects with
-- tenant_id NULL and works fine purely by being on the list.
--
-- WHAT THIS DOES. Rather than adding songwriting to the blanket exemption, this
-- re-derives its tenancy from the object PATH, which the application controls and
-- which is already the basis of the bucket's permissive policies. Keys are laid
-- out <tenant_id>/<user_id>/<song_id>/take-<ts>.<ext>, so foldername(name)[1] IS
-- the owning tenant.
--
-- This is deliberately STRICTER than exempting the bucket. Exempting it made 16
-- objects visible in testing, 11 of them under a different tenant's folder with
-- no owner recorded — meaning some permissive policy grants more broadly than
-- intended and the restrictive rule was the only thing containing it. Deriving
-- tenancy from the path keeps that containment: those 11 fail this clause and
-- stay hidden no matter what the permissive side allows.
--
-- NOTE: that over-broad permissive grant still exists and still deserves an
-- audit for the OTHER buckets. This migration contains it for songwriting only;
-- it does not fix it.
--
-- Safe to re-run: the policy is dropped and recreated.

DO $$
DECLARE
  v_expected text := '((bucket_id = ANY (ARRAY[''site-branding''::text, ''personal-scores''::text, ''studio''::text, ''studio-video''::text, ''parttrack''::text])) OR (tenant_id = current_tenant_id()))';
  v_actual   text;
BEGIN
  SELECT pg_get_expr(polqual, polrelid) INTO v_actual
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polname = 'tenant_isolation_restrict';

  IF v_actual IS NULL THEN
    RAISE EXCEPTION 'tenant_isolation_restrict not found on storage.objects — inspect before re-running; this migration will not invent a policy.';
  END IF;

  -- If the policy has already been changed by something else, stop rather than
  -- silently clobbering it. A storage-wide RESTRICTIVE policy is not something
  -- to overwrite blind.
  IF v_actual <> v_expected AND position('songwriting' in v_actual) = 0 THEN
    RAISE EXCEPTION 'tenant_isolation_restrict does not match the expected definition. Found: %', v_actual;
  END IF;
END $$;

DROP POLICY IF EXISTS tenant_isolation_restrict ON storage.objects;

CREATE POLICY tenant_isolation_restrict ON storage.objects
  AS RESTRICTIVE FOR ALL TO public
  USING (
    -- Buckets whose tenancy is enforced by path in their own permissive
    -- policies. storage.objects.tenant_id is not reliable for these.
    (bucket_id = ANY (ARRAY[
      'site-branding', 'personal-scores', 'studio', 'studio-video', 'parttrack'
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
  'Tenant isolation for storage. Buckets in the exempt array enforce tenancy via '
  'their own path-based permissive policies because storage.objects.tenant_id is '
  'stamped by the storage API without the caller''s tenant context. songwriting '
  'is NOT exempt: its tenancy is enforced here from foldername(name)[1].';
