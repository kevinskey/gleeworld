-- Track when a teacher has actually listened to (or otherwise reviewed)
-- a student practice recording, so the Command Center "Needs Your
-- Attention" card can clear takes that have been heard but didn't
-- warrant written feedback. Stamping `reviewed_at` happens on the
-- client (onPlay handler) or alongside a teacher_notes save.

ALTER TABLE gw_practice_recordings
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE INDEX IF NOT EXISTS gw_practice_recordings_unreviewed_idx
  ON gw_practice_recordings (tenant_id, created_at DESC)
  WHERE reviewed_at IS NULL;
