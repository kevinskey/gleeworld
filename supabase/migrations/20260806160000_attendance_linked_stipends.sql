-- Attendance-linked stipends: policy, period, and per-student award.
-- Earned amounts are NOT stored here; they are derived by v_stipend_standing
-- until a period closes, at which point final_amount is snapshotted.

CREATE TABLE IF NOT EXISTS public.gw_stipend_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  name TEXT NOT NULL DEFAULT 'Default',
  -- status -> credit weight. Statuses absent from this map earn no credit
  -- and are reported separately as unmapped.
  weights JSONB NOT NULL DEFAULT
    '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0}'::jsonb,
  rounding TEXT NOT NULL DEFAULT 'cent' CHECK (rounding IN ('cent','dollar')),
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS public.gw_stipend_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  default_amount NUMERIC(10,2) NOT NULL CHECK (default_amount >= 0),
  -- The agreed denominator, typed by an admin. Never derived from the calendar.
  required_services INT NOT NULL CHECK (required_services > 0),
  -- {"event_types":["rehearsal","service"]}; empty or absent means all
  -- attendance-required events in range.
  event_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_id UUID REFERENCES public.gw_stipend_policies(id),
  -- Weights pinned at close so a closed period reproduces its own numbers
  -- even after the tenant edits the live policy.
  policy_weights JSONB,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','closed','paid')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT stipend_period_dates CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.gw_stipend_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  period_id UUID NOT NULL
    REFERENCES public.gw_stipend_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL CHECK (base_amount >= 0),
  -- Mid-period joiners are measured against fewer services.
  required_services_override INT CHECK (required_services_override > 0),
  enrolled_on DATE,
  final_amount NUMERIC(10,2),
  override_amount NUMERIC(10,2) CHECK (override_amount >= 0),
  override_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','closed','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT stipend_award_unique_per_period UNIQUE (period_id, user_id),
  -- An override moves money by hand; it must leave a reason on the record.
  CONSTRAINT stipend_override_needs_reason CHECK (
    override_amount IS NULL
    OR (override_reason IS NOT NULL AND length(btrim(override_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS gw_stipend_policies_tenant_idx
  ON public.gw_stipend_policies (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS gw_stipend_periods_tenant_idx
  ON public.gw_stipend_periods (tenant_id, status, starts_on DESC);
CREATE INDEX IF NOT EXISTS gw_stipend_awards_period_idx
  ON public.gw_stipend_awards (tenant_id, period_id);
CREATE INDEX IF NOT EXISTS gw_stipend_awards_user_idx
  ON public.gw_stipend_awards (tenant_id, user_id);

-- Tenant defaulting + updated_at
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_stipend_policies','gw_stipend_periods','gw_stipend_awards']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_tenant_id_default ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_tenant_id_default BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t);
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

ALTER TABLE public.gw_stipend_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_stipend_periods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_stipend_awards   ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE tenant isolation: applies on top of every permissive policy.
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_policies;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_policies AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_periods;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_periods AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_awards;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_awards AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Admins manage everything.
DROP POLICY IF EXISTS stipend_policies_admin ON public.gw_stipend_policies;
CREATE POLICY stipend_policies_admin ON public.gw_stipend_policies FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS stipend_periods_admin ON public.gw_stipend_periods;
CREATE POLICY stipend_periods_admin ON public.gw_stipend_periods FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS stipend_awards_admin ON public.gw_stipend_awards;
CREATE POLICY stipend_awards_admin ON public.gw_stipend_awards FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

-- Students read their own award, and the period it belongs to.
DROP POLICY IF EXISTS stipend_awards_own_read ON public.gw_stipend_awards;
CREATE POLICY stipend_awards_own_read ON public.gw_stipend_awards FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS stipend_periods_own_read ON public.gw_stipend_periods;
CREATE POLICY stipend_periods_own_read ON public.gw_stipend_periods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_stipend_awards a
    WHERE a.period_id = gw_stipend_periods.id AND a.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS stipend_policies_read ON public.gw_stipend_policies;
CREATE POLICY stipend_policies_read ON public.gw_stipend_policies FOR SELECT
  USING (true);
