-- Practice recordings — students record themselves practicing with the
-- metronome, save the take, and a teacher in the same tenant can listen
-- back. Audio blobs live in Supabase Storage; this table only holds the
-- metadata + storage path.

CREATE TABLE IF NOT EXISTS gw_practice_recordings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT current_tenant_id(),
  user_id      uuid NOT NULL,
  -- Path inside the `sheet-music` bucket, e.g.
  --   practice-recordings/{user_id}/{timestamp}.webm
  audio_path   text NOT NULL,
  -- Cached public URL so the player doesn't have to sign a fresh URL
  -- on every page load. Storage policies still gate actual byte reads.
  audio_url    text NOT NULL,
  duration_sec numeric(6, 2),
  bpm          integer,
  time_sig     text,
  -- Free-form label the student types ("Mozart K. 545 first 16 bars").
  title        text,
  -- Optional teacher feedback. Tenant admins / instructors edit this
  -- after listening back; the student can read it but not edit it.
  teacher_notes text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_practice_recordings_user_idx
  ON gw_practice_recordings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gw_practice_recordings_tenant_idx
  ON gw_practice_recordings (tenant_id, created_at DESC);

ALTER TABLE gw_practice_recordings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation — clamp every read/write to the caller's tenant.
CREATE POLICY tenant_isolation_restrict
  ON gw_practice_recordings
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Students read their own recordings; staff (admins / instructors /
-- super-admins) read everyone's. Writes are user-scoped.
CREATE POLICY practice_recordings_read
  ON gw_practice_recordings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );

CREATE POLICY practice_recordings_insert
  ON gw_practice_recordings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY practice_recordings_update_owner
  ON gw_practice_recordings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff can update teacher_notes on any recording in the tenant.
CREATE POLICY practice_recordings_update_staff
  ON gw_practice_recordings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin OR p.is_super_admin OR p.role IN ('instructor', 'teacher', 'conductor'))
    )
  );

CREATE POLICY practice_recordings_delete_owner
  ON gw_practice_recordings
  FOR DELETE
  USING (user_id = auth.uid());
