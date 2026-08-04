-- Pitch match Sets mode — sequential multi-note challenges. We reuse the
-- existing gw_pitch_match_attempts table (one row per note attempt) and
-- add two columns that identify which set + which position within it.

ALTER TABLE gw_pitch_match_attempts
  DROP CONSTRAINT IF EXISTS gw_pitch_match_attempts_mode_check;
ALTER TABLE gw_pitch_match_attempts
  ADD CONSTRAINT gw_pitch_match_attempts_mode_check
  CHECK (mode IN ('random', 'interval', 'scale', 'time_attack', 'precision', 'sets'));

ALTER TABLE gw_pitch_match_attempts
  ADD COLUMN IF NOT EXISTS set_id text,
  ADD COLUMN IF NOT EXISTS set_position integer;

CREATE INDEX IF NOT EXISTS gw_pitch_match_attempts_set_idx
  ON gw_pitch_match_attempts (user_id, set_id, created_at DESC)
  WHERE set_id IS NOT NULL;
