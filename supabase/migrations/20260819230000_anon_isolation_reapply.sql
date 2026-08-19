-- Two anon-exposure fixes found while auditing the Lyke House tenant.
--
-- (1) gw_course_class_sessions still carried the original January 2026 policy
--     "Anyone can view class sessions" ... FOR SELECT USING (true). What was
--     actually scoping it was the RESTRICTIVE anon_tenant_isolation policy
--     added in 20260610150000 — the permissive policy itself grants the world
--     read access, so the tenant header was the only thing standing between
--     anon and every course's meeting schedule. Every consumer of this table
--     (QuickAttendanceQR, CourseClassCalendar, InstructorAttendanceHub,
--     EventQRCode, DailyRunSheet, EventAttendanceDialog) is an authenticated
--     dashboard screen; nothing public-facing reads it.
--
-- (2) gw_tenants has no tenant_id column, so the 20260610150000 DO loop —
--     which keys off that column — skipped it. Anon could therefore list the
--     entire customer roster (slug, name, plan, status) for all 13 tenants.
--     Added as a RESTRICTIVE policy so it only narrows whatever permissive
--     grants already exist; the public site still resolves its own tenant for
--     branding because anon_tenant_id() is SECURITY DEFINER.
--
-- (3) That same DO loop was one-shot: any tenant-scoped table created after
--     2026-06-10 never got an anon_tenant_isolation policy. Re-running it is
--     idempotent (DROP IF EXISTS + CREATE) and picks up the stragglers.

-- (1) ------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view class sessions"
  ON public.gw_course_class_sessions;

CREATE POLICY "Tenant members can view class sessions"
  ON public.gw_course_class_sessions
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- (2) ------------------------------------------------------------------
DROP POLICY IF EXISTS anon_tenant_self ON public.gw_tenants;

CREATE POLICY anon_tenant_self
  ON public.gw_tenants
  AS RESTRICTIVE FOR SELECT TO anon
  USING (id = public.anon_tenant_id());

-- (3) ------------------------------------------------------------------
DO $$
DECLARE
  t text;
  n int := 0;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO anon
         USING (tenant_id = public.anon_tenant_id())
         WITH CHECK (tenant_id = public.anon_tenant_id())',
      t
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'anon_tenant_isolation applied to % tenant-scoped tables', n;
END;
$$;
