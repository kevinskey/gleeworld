-- Seating Charts Phase 2: version snapshots + roster fan-out RPC.
-- Additive migration; Phase-1 tables untouched.

-- 1. gw_seating_chart_versions — point-in-time snapshot of an arrangement.
CREATE TABLE IF NOT EXISTS public.gw_seating_chart_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  arrangement_id uuid NOT NULL REFERENCES public.gw_seating_chart_arrangements(id) ON DELETE CASCADE,
  name           text NOT NULL DEFAULT 'Snapshot',
  snapshot       jsonb NOT NULL,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_sc_versions_arr_idx
  ON public.gw_seating_chart_versions (arrangement_id, created_at DESC);

ALTER TABLE public.gw_seating_chart_versions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gw_seating_chart_versions_tenant_default
  ON public.gw_seating_chart_versions;
CREATE TRIGGER trg_gw_seating_chart_versions_tenant_default
  BEFORE INSERT ON public.gw_seating_chart_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP POLICY IF EXISTS gw_seating_chart_versions_tenant_iso
  ON public.gw_seating_chart_versions;
CREATE POLICY gw_seating_chart_versions_tenant_iso
  ON public.gw_seating_chart_versions AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS gw_sc_versions_read ON public.gw_seating_chart_versions;
CREATE POLICY gw_sc_versions_read ON public.gw_seating_chart_versions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gw_sc_versions_write ON public.gw_seating_chart_versions;
CREATE POLICY gw_sc_versions_write ON public.gw_seating_chart_versions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_seating_chart_arrangements a
    JOIN public.gw_seating_charts c ON c.id = a.chart_id
    WHERE a.id = arrangement_id
      AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_seating_chart_arrangements a
    JOIN public.gw_seating_charts c ON c.id = a.chart_id
    WHERE a.id = arrangement_id
      AND (c.owner_id = auth.uid() OR public.is_current_user_admin_or_super_admin())));

-- 2. list_seating_chart_roster: fan out an association to (user_id, name, voice_part, instrument).
CREATE OR REPLACE FUNCTION public.list_seating_chart_roster(
  p_association_type text,
  p_association_id   uuid
)
RETURNS TABLE (
  user_id     uuid,
  full_name   text,
  voice_part  text,
  instrument  text,
  avatar_url  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_association_type = 'ensemble' THEN
    RETURN QUERY
      SELECT p.user_id, pd.full_name, pd.voice_part, NULL::text, pd.avatar_url
      FROM public.gw_ensemble_members em
      JOIN public.gw_profiles p ON p.id = em.profile_id
      LEFT JOIN public.gw_profiles_directory pd ON pd.user_id = p.user_id
      WHERE em.ensemble_id = p_association_id AND em.status = 'active';

  ELSIF p_association_type = 'course' THEN
    RETURN QUERY
      SELECT ce.user_id, pd.full_name, pd.voice_part, NULL::text, pd.avatar_url
      FROM public.gw_course_enrollments ce
      LEFT JOIN public.gw_profiles_directory pd ON pd.user_id = ce.user_id
      WHERE ce.course_id = p_association_id
        AND ce.enrollment_status = 'enrolled'
        AND ce.role = 'student';

  ELSIF p_association_type IN ('tour', 'tour_event') THEN
    RETURN QUERY
      SELECT tr.user_id, pd.full_name, pd.voice_part, NULL::text, pd.avatar_url
      FROM public.gw_tour_roster tr
      LEFT JOIN public.gw_profiles_directory pd ON pd.user_id = tr.user_id
      WHERE tr.tour_id = p_association_id
        AND tr.status IN ('confirmed', 'pending');

  ELSE
    -- Unknown association type — return empty set rather than raising.
    RETURN;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.list_seating_chart_roster(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_seating_chart_roster(text, uuid) TO authenticated;
