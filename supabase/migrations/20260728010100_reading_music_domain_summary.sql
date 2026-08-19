-- Client-facing rollup for the Reading Music Progress tab. Pitch &
-- Intervals sources from gw_pitch_match_attempts (matched flag).
-- Sight-Singing would source from gw_sight_reading_activity, but that
-- table doesn't exist, so the sight branch is omitted. Missing rows for
-- sight_singing, rhythm/dictation/harmony/scales render as 0% in UI.

CREATE OR REPLACE VIEW reading_music_domain_summary AS
WITH pitch AS (
  SELECT
    user_id,
    'pitch_intervals'::text AS domain,
    COUNT(*)::int AS attempts,
    SUM(CASE WHEN matched THEN 1 ELSE 0 END)::int AS matched,
    MAX(created_at) AS last_activity_at
  FROM gw_pitch_match_attempts
  GROUP BY user_id
)
SELECT
  user_id,
  domain,
  attempts,
  matched,
  CASE WHEN attempts = 0 THEN 0
       ELSE ROUND((matched::numeric / attempts::numeric) * 100)::int END AS accuracy_pct,
  last_activity_at
FROM pitch;

GRANT SELECT ON reading_music_domain_summary TO authenticated;
