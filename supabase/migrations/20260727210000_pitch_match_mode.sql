-- Pitch matching gamification — add a `mode` column so we can distinguish
-- Random / Interval / Scale / Time Attack / Precision attempts in stats.
-- Existing rows are backfilled to 'random' (the only mode before this).

ALTER TABLE gw_pitch_match_attempts
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'random'
    CHECK (mode IN ('random', 'interval', 'scale', 'time_attack', 'precision'));

CREATE INDEX IF NOT EXISTS gw_pitch_match_attempts_mode_idx
  ON gw_pitch_match_attempts (user_id, mode, created_at DESC);
