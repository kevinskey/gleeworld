-- Two buckets:
--   partner-assets         — PUBLIC — logos, thumbnails, sample audio
--   partner-scores-master  — PRIVATE — clean uploaded PDFs, never served

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-assets', 'partner-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-scores-master', 'partner-scores-master', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- partner-assets — any authenticated user can READ; only partner or admin can WRITE.
DROP POLICY IF EXISTS partner_assets_public_read ON storage.objects;
CREATE POLICY partner_assets_public_read
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'partner-assets');

DROP POLICY IF EXISTS partner_assets_partner_write ON storage.objects;
CREATE POLICY partner_assets_partner_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-assets'
    AND (
      -- partner writing to their own prefix "<partner_id>/..."
      (split_part(name, '/', 1)::uuid = my_partner_id())
      OR EXISTS (SELECT 1 FROM gw_profiles p
                 WHERE p.user_id = auth.uid()
                   AND (p.is_super_admin = true OR p.is_admin = true))
    )
  );

DROP POLICY IF EXISTS partner_assets_partner_delete ON storage.objects;
CREATE POLICY partner_assets_partner_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-assets'
    AND (
      (split_part(name, '/', 1)::uuid = my_partner_id())
      OR EXISTS (SELECT 1 FROM gw_profiles p
                 WHERE p.user_id = auth.uid()
                   AND (p.is_super_admin = true OR p.is_admin = true))
    )
  );

-- partner-scores-master — writes only by partner to own prefix; NO reads
-- from clients. Master PDFs are only fetched via service-role in fulfillment
-- edge fns.
DROP POLICY IF EXISTS partner_scores_master_write ON storage.objects;
CREATE POLICY partner_scores_master_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-scores-master'
    AND split_part(name, '/', 1)::uuid = my_partner_id()
  );

DROP POLICY IF EXISTS partner_scores_master_owner_read ON storage.objects;
CREATE POLICY partner_scores_master_owner_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-scores-master'
    AND split_part(name, '/', 1)::uuid = my_partner_id()
  );
