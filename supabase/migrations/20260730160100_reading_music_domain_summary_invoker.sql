-- reading_music_domain_summary was created without `security_invoker`, so
-- Postgres defaults to security-definer semantics: the underlying RLS on
-- gw_pitch_match_attempts is evaluated against the VIEW OWNER, not the
-- caller. Result: every authenticated user querying the view sees every
-- other user's pitch-match aggregates in their tenant (bypassing the
-- per-user scoping the source-table RLS enforces).
--
-- Fix by recreating the view WITH (security_invoker = on) so RLS on the
-- source table runs against the caller's JWT (auth.uid()), matching the
-- design intent noted in 20260728010100.

CREATE OR REPLACE VIEW public.reading_music_domain_summary
WITH (security_invoker = on)
AS
WITH pitch AS (
  SELECT
    user_id,
    'pitch_intervals'::text AS domain,
    COUNT(*)::int AS attempts,
    SUM(CASE WHEN matched THEN 1 ELSE 0 END)::int AS matched,
    MAX(created_at) AS last_activity_at
  FROM public.gw_pitch_match_attempts
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

GRANT SELECT ON public.reading_music_domain_summary TO authenticated;
