-- GleeWorld Studio — Phase 1 foundations.
--
-- A Studio session is a multi-track music project. The full document
-- (tracks, clips, FX, MIDI notes, automation) lives as JSON in
-- Supabase Storage at studio/<tenant>/sessions/<id>/manifest.json,
-- alongside its audio assets at studio/<tenant>/sessions/<id>/audio/.
--
-- This table is the index: who owns each session, when it was last
-- modified, where its storage prefix is, and what schema version it
-- was serialized at. Listing the user's sessions is a DB query;
-- opening one is a Storage fetch of the manifest.

CREATE TABLE IF NOT EXISTS gw_studio_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT current_tenant_id(),
  owner_user_id   uuid NOT NULL,
  title           text NOT NULL DEFAULT 'Untitled session',
  schema_version  text NOT NULL,
  -- Storage prefix WITHOUT trailing slash, e.g.
  --   studio/ae2fbec2-.../sessions/d9...
  storage_prefix  text NOT NULL,
  duration_seconds numeric(8, 2) NOT NULL DEFAULT 0,
  -- Editing context cache so the session list can show "60s · 4 tracks"
  -- without fetching the manifest.
  track_count     integer NOT NULL DEFAULT 0,
  asset_count     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_studio_sessions_owner_idx
  ON gw_studio_sessions (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS gw_studio_sessions_tenant_idx
  ON gw_studio_sessions (tenant_id, updated_at DESC);

-- ── BEFORE INSERT trigger: backfill tenant_id from JWT when null ─────
-- Same pattern as the rest of the project — RLS WITH CHECK silently
-- rejects rows with null tenant_id, so we set the DEFAULT and the
-- trigger as belt-and-suspenders.

CREATE OR REPLACE FUNCTION gw_studio_sessions_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_studio_sessions_fill_tenant_trg ON gw_studio_sessions;
CREATE TRIGGER gw_studio_sessions_fill_tenant_trg
  BEFORE INSERT ON gw_studio_sessions
  FOR EACH ROW EXECUTE FUNCTION gw_studio_sessions_fill_tenant();

-- ── updated_at bump trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION gw_studio_sessions_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_studio_sessions_touch_trg ON gw_studio_sessions;
CREATE TRIGGER gw_studio_sessions_touch_trg
  BEFORE UPDATE ON gw_studio_sessions
  FOR EACH ROW EXECUTE FUNCTION gw_studio_sessions_touch();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE gw_studio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict
  ON gw_studio_sessions
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Owner can do everything to their own sessions; staff in the same
-- tenant can read all sessions (for review / class projects).
CREATE POLICY studio_sessions_read
  ON gw_studio_sessions
  FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );

CREATE POLICY studio_sessions_insert
  ON gw_studio_sessions
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY studio_sessions_update_owner
  ON gw_studio_sessions
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY studio_sessions_delete_owner
  ON gw_studio_sessions
  FOR DELETE
  USING (owner_user_id = auth.uid());

-- ── Storage bucket ───────────────────────────────────────────────────
-- The "studio" bucket holds the manifest.json + audio assets per
-- session. Private bucket; reads always go through signed URLs from
-- the storage helper so RLS-equivalent tenant scoping is enforced by
-- the path prefix studio/<tenant_id>/.

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio', 'studio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: tenant prefix gating + owner ownership.
-- Path layout: studio/<tenant_id>/sessions/<session_id>/...

CREATE POLICY studio_bucket_tenant_read
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'studio'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
  );

CREATE POLICY studio_bucket_owner_write
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'studio'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY studio_bucket_owner_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'studio'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );

CREATE POLICY studio_bucket_owner_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'studio'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );
