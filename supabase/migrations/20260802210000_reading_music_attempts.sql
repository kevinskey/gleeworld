-- Reading Music consolidated attempts (Phase 2). Mirrors gw_pitch_match_attempts'
-- RLS pattern. Rhythm writes here now; pitch/sight-singing migrate later.
CREATE TABLE IF NOT EXISTS gw_reading_music_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain         text NOT NULL CHECK (domain IN ('pitch_intervals','rhythm','sight_singing','dictation','harmony','scales_theory')),
  drill          text NOT NULL,
  mode           text NOT NULL DEFAULT 'practice' CHECK (mode IN ('practice','assessment')),
  level          integer NOT NULL,
  score          numeric NOT NULL,
  passed         boolean NOT NULL DEFAULT false,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_score numeric,
  overridden_by  uuid REFERENCES auth.users(id),
  overridden_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_rm_attempts_user_idx ON gw_reading_music_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_rm_attempts_tenant_idx ON gw_reading_music_attempts (tenant_id, created_at DESC);

ALTER TABLE gw_reading_music_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_rm_attempts_tenant_iso ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_tenant_iso
  ON gw_reading_music_attempts AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_rm_attempts_self_all ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_self_all
  ON gw_reading_music_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gw_rm_attempts_teacher_read ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_teacher_read
  ON gw_reading_music_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

DROP TRIGGER IF EXISTS trg_rm_attempts_tenant_default ON gw_reading_music_attempts;
CREATE TRIGGER trg_rm_attempts_tenant_default
  BEFORE INSERT ON gw_reading_music_attempts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();

-- Teacher override: SECURITY DEFINER RPC instead of a column-limited UPDATE
-- policy — simpler to audit, impossible to widen by accident.
CREATE OR REPLACE FUNCTION override_reading_music_attempt(p_attempt_id uuid, p_new_score numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM gw_reading_music_attempts WHERE id = p_attempt_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF v_tenant <> current_tenant_id() THEN RAISE EXCEPTION 'attempt not in current tenant'; END IF;
  IF NOT EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid()
                 AND (p.is_super_admin = true OR p.is_admin = true)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_new_score < 0 OR p_new_score > 100 THEN RAISE EXCEPTION 'score out of range'; END IF;
  UPDATE gw_reading_music_attempts
     SET override_score = p_new_score, overridden_by = auth.uid(), overridden_at = now()
   WHERE id = p_attempt_id;
END $$;
REVOKE ALL ON FUNCTION override_reading_music_attempt(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION override_reading_music_attempt(uuid, numeric) TO authenticated;

-- Domain summary: add the rhythm branch. Effective score honors overrides.
CREATE OR REPLACE VIEW reading_music_domain_summary AS
WITH pitch AS (
  SELECT user_id, 'pitch_intervals'::text AS domain,
         COUNT(*)::int AS attempts,
         SUM(CASE WHEN matched THEN 1 ELSE 0 END)::int AS matched,
         MAX(created_at) AS last_activity_at
  FROM gw_pitch_match_attempts GROUP BY user_id
), rm AS (
  SELECT user_id, domain,
         COUNT(*)::int AS attempts,
         SUM(CASE WHEN COALESCE(override_score, score) >= 80 THEN 1 ELSE 0 END)::int AS matched,
         MAX(created_at) AS last_activity_at
  FROM gw_reading_music_attempts GROUP BY user_id, domain
)
SELECT user_id, domain, attempts, matched,
       CASE WHEN attempts = 0 THEN 0
            ELSE ROUND((matched::numeric / attempts::numeric) * 100)::int END AS accuracy_pct,
       last_activity_at
FROM (SELECT * FROM pitch UNION ALL SELECT * FROM rm) u;

GRANT SELECT ON reading_music_domain_summary TO authenticated;
