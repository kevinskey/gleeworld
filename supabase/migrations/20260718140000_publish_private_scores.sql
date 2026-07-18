-- Let a tenant score reference a PRIVATE storage object instead of a public
-- pdf_url. This is what makes "publish my personal library to a tenant"
-- possible without copying copyrighted PDFs into the public sheet-music
-- bucket, where they would get permanent unauthenticated URLs.
--
-- When storage_path is set the client signs a short-lived URL; pdf_url stays
-- the path for legacy/public rows. Exactly one of the two should be set.

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS storage_path   text,
  ADD COLUMN IF NOT EXISTS storage_bucket text;

COMMENT ON COLUMN public.gw_sheet_music.storage_path IS
  'Key inside storage_bucket for privately-hosted scores. When set, clients sign a URL instead of using pdf_url.';
COMMENT ON COLUMN public.gw_sheet_music.storage_bucket IS
  'Bucket holding storage_path (e.g. personal-scores). NULL for legacy public pdf_url rows.';

-- Index the lookup the storage policy below performs on every object read.
CREATE INDEX IF NOT EXISTS idx_gw_sheet_music_storage_ref
  ON public.gw_sheet_music (storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

-- Storage RLS: the personal-scores bucket is owner-only by design
-- (20260712120000_personal_music_library.sql). This adds ONE narrow extra
-- read path — an object becomes readable to a tenant if, and only if, a
-- gw_sheet_music row in THAT tenant points at it. Unpublishing (deleting the
-- row) revokes access immediately. No other bucket is affected.
DROP POLICY IF EXISTS "tenant members read published personal scores" ON storage.objects;
CREATE POLICY "tenant members read published personal scores"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'personal-scores'
  AND EXISTS (
    SELECT 1
    FROM public.gw_sheet_music sm
    WHERE sm.storage_bucket = 'personal-scores'
      AND sm.storage_path   = storage.objects.name
      AND sm.tenant_id      = public.current_tenant_id()
  )
);
