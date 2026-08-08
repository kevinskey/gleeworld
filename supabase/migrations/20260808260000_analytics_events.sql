-- A shared named-event analytics primitive — the first one this codebase has.
--
-- The audit finding was stark: no trackEvent()/logEvent() exists anywhere; no
-- PostHog/GA/Plausible either. What exists is automatic page-view telemetry
-- (user_page_views) and per-vertical silos like gw_music_analytics. The
-- All-State brief names eight events to track "with the existing provider",
-- and there is no existing provider — so this is it, deliberately minimal:
-- one table, one insert path, no SDK.
--
-- Design constraints that matter:
-- - INSERT is fire-and-forget from the client and must never break a feature.
--   The frontend helper swallows errors; the table has no FK on event names.
-- - Rows are facts about usage, not PII: event_name + a small jsonb props.
--   Nothing here should ever hold free text a user typed.
-- - Reads are staff-only. Members emit events; they don't browse them.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gw_analytics_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  user_id    uuid DEFAULT auth.uid(),
  event_name text NOT NULL,
  props      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_analytics_events_tenant_name_time
  ON public.gw_analytics_events(tenant_id, event_name, created_at DESC);

ALTER TABLE public.gw_analytics_events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gw_analytics_events_tenant ON public.gw_analytics_events;
CREATE TRIGGER trg_gw_analytics_events_tenant BEFORE INSERT ON public.gw_analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_analytics_events;
CREATE POLICY tenant_isolation_restrict ON public.gw_analytics_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS anon_tenant_isolation ON public.gw_analytics_events;
CREATE POLICY anon_tenant_isolation ON public.gw_analytics_events
  AS RESTRICTIVE FOR ALL TO anon
  USING (tenant_id = public.anon_tenant_id())
  WITH CHECK (tenant_id = public.anon_tenant_id());

-- Any signed-in member may emit an event as themselves.
DROP POLICY IF EXISTS gw_analytics_events_emit ON public.gw_analytics_events;
CREATE POLICY gw_analytics_events_emit ON public.gw_analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Staff read their tenant's events; nobody else reads anything.
DROP POLICY IF EXISTS gw_analytics_events_staff_read ON public.gw_analytics_events;
CREATE POLICY gw_analytics_events_staff_read ON public.gw_analytics_events
  FOR SELECT TO authenticated
  USING (public.gw_all_state_is_staff());

REVOKE ALL ON public.gw_analytics_events FROM anon;
GRANT INSERT, SELECT ON public.gw_analytics_events TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
