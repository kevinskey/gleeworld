-- PartTrack Plan 2: assignments by voice part + listen telemetry.
-- Spec §3, §5. Follows the tenant pattern of 20260801090000_parttrack_pipeline.sql.

CREATE TABLE IF NOT EXISTS public.gw_parttrack_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id    uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  ensemble_id uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL,
  voice_part  text,                -- normalized code (S1, A2, ...); NULL = all parts
  due_date    date,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_assignments_score_idx
  ON public.gw_parttrack_assignments (score_id);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_listens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id         uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_role        text,
  mode             text NOT NULL DEFAULT 'player' CHECK (mode IN ('player','download')),
  seconds_listened int,             -- null for download rows
  tempo_pct        int,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_listens_score_user_idx
  ON public.gw_parttrack_listens (score_id, user_id, occurred_at DESC);

-- Rollup for the accountability tab. security_invoker so RLS still applies.
CREATE OR REPLACE VIEW public.gw_parttrack_listen_rollup
WITH (security_invoker = true) AS
SELECT tenant_id, score_id, user_id,
       COALESCE(SUM(seconds_listened), 0)::int AS total_seconds,
       MAX(occurred_at)                        AS last_at,
       ROUND(AVG(tempo_pct))::int              AS avg_tempo_pct
FROM public.gw_parttrack_listens
WHERE mode = 'player'
GROUP BY tenant_id, score_id, user_id;

ALTER TABLE public.gw_parttrack_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_listens     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_parttrack_assignments','gw_parttrack_listens'] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_tenant_iso ON public.%1$s; ' ||
      'CREATE POLICY %1$s_tenant_iso ON public.%1$s AS RESTRICTIVE ' ||
      'FOR ALL TO authenticated, anon ' ||
      'USING (tenant_id = public.current_tenant_id()) ' ||
      'WITH CHECK (tenant_id = public.current_tenant_id());',
      t
    );
  END LOOP;
END $$;

-- Assignments: everyone reads, admins write.
DROP POLICY IF EXISTS gw_parttrack_assignments_read ON public.gw_parttrack_assignments;
CREATE POLICY gw_parttrack_assignments_read ON public.gw_parttrack_assignments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS gw_parttrack_assignments_admin_write ON public.gw_parttrack_assignments;
CREATE POLICY gw_parttrack_assignments_admin_write ON public.gw_parttrack_assignments
  FOR ALL TO authenticated
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

-- Listens: users insert their own rows and read their own; admins read all.
DROP POLICY IF EXISTS gw_parttrack_listens_insert_own ON public.gw_parttrack_listens;
CREATE POLICY gw_parttrack_listens_insert_own ON public.gw_parttrack_listens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS gw_parttrack_listens_read ON public.gw_parttrack_listens;
CREATE POLICY gw_parttrack_listens_read ON public.gw_parttrack_listens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin_or_super_admin());
