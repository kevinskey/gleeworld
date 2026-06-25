-- GleeWorld Video — Phase 1 foundations.
--
-- A user uploads a video; the file lands in the `studio-video` bucket
-- under studio-video/<tenant_id>/videos/<video_id>/source.<ext>. This
-- table indexes the metadata + processing state so the library page
-- can render without fetching every blob.
--
-- Phase 1 plays the source MP4 directly. Phase 2 adds an FFmpeg
-- worker that transcodes to HLS and populates hls_path + thumb_path.

CREATE TABLE IF NOT EXISTS gw_studio_videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT current_tenant_id(),
  owner_user_id   uuid NOT NULL,
  title           text NOT NULL DEFAULT 'Untitled video',
  description     text,
  -- Object paths within the studio-video bucket.
  source_path     text NOT NULL,
  -- HLS playlist path; populated by the transcoder worker in Phase 2.
  hls_path        text,
  thumb_path      text,
  duration_seconds numeric(8, 2),
  size_bytes      bigint,
  mime            text,
  -- Lifecycle: 'uploading' → 'processing' (when worker exists) → 'ready' → 'error'
  status          text NOT NULL DEFAULT 'uploading',
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_studio_videos_owner_idx
  ON gw_studio_videos (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gw_studio_videos_tenant_idx
  ON gw_studio_videos (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gw_studio_videos_status_idx
  ON gw_studio_videos (status, created_at) WHERE status IN ('uploading', 'processing');

-- ── tenant_id backfill trigger (same pattern as gw_studio_sessions) ──

CREATE OR REPLACE FUNCTION gw_studio_videos_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_studio_videos_fill_tenant_trg ON gw_studio_videos;
CREATE TRIGGER gw_studio_videos_fill_tenant_trg
  BEFORE INSERT ON gw_studio_videos
  FOR EACH ROW EXECUTE FUNCTION gw_studio_videos_fill_tenant();

-- ── updated_at bump ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION gw_studio_videos_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_studio_videos_touch_trg ON gw_studio_videos;
CREATE TRIGGER gw_studio_videos_touch_trg
  BEFORE UPDATE ON gw_studio_videos
  FOR EACH ROW EXECUTE FUNCTION gw_studio_videos_touch();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE gw_studio_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON gw_studio_videos
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY studio_videos_read
  ON gw_studio_videos
  FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );

CREATE POLICY studio_videos_insert
  ON gw_studio_videos
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY studio_videos_update_owner
  ON gw_studio_videos
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY studio_videos_delete_owner
  ON gw_studio_videos
  FOR DELETE
  USING (owner_user_id = auth.uid());

-- ── Storage bucket ───────────────────────────────────────────────────
-- Layout: studio-video/<tenant_id>/videos/<video_id>/source.<ext>
--                                          /hls/index.m3u8           (Phase 2)
--                                          /thumb.jpg                (Phase 2)

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-video', 'studio-video', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY studio_video_tenant_read
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'studio-video'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
  );

CREATE POLICY studio_video_owner_write
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'studio-video'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY studio_video_owner_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'studio-video'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );

CREATE POLICY studio_video_owner_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'studio-video'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );
