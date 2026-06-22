-- Box Office Phase I — member-initiated comp requests.
--
-- Replaces the legacy concert_ticket_requests workflow (course-scoped,
-- separate UI). Members submit a request for free tickets, an admin
-- approves or denies, approval mints comps through the existing
-- gw_box_office_issue_comps function so the same QR + check-in path
-- applies.
--
-- box_office_request_max on gw_events governs the per-request cap; NULL
-- means requests are disabled for the event (admins must explicitly
-- opt-in by setting a value).

ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS box_office_request_max INTEGER
    CHECK (box_office_request_max IS NULL OR box_office_request_max BETWEEN 1 AND 20);

CREATE TABLE IF NOT EXISTS public.gw_ticket_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.gw_events(id) ON DELETE CASCADE,
  -- Which tier the comps would draw against. Optional at request time;
  -- admin picks one when approving if the requester didn't.
  tier_id UUID REFERENCES public.gw_ticket_tiers(id) ON DELETE SET NULL,
  -- The asker. user_id is set if they're signed in; we always capture
  -- email so we can email the decision either way.
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_email TEXT NOT NULL,
  requester_name  TEXT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  decision_note TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Audit-trail link to the order minted on approval.
  fulfilled_order_id UUID REFERENCES public.gw_ticket_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_ticket_requests_tenant_status_idx
  ON public.gw_ticket_requests (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_ticket_requests_event_status_idx
  ON public.gw_ticket_requests (event_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_ticket_requests_user_idx
  ON public.gw_ticket_requests (requester_user_id, status);

-- Tenant-id trigger using the existing Box Office helper.
DROP TRIGGER IF EXISTS trg_gw_ticket_requests_set_tenant ON public.gw_ticket_requests;
CREATE TRIGGER trg_gw_ticket_requests_set_tenant
  BEFORE INSERT ON public.gw_ticket_requests
  FOR EACH ROW EXECUTE FUNCTION public.gw_box_office_set_tenant();

DROP TRIGGER IF EXISTS trg_gw_ticket_requests_touch ON public.gw_ticket_requests;
CREATE TRIGGER trg_gw_ticket_requests_touch
  BEFORE UPDATE ON public.gw_ticket_requests
  FOR EACH ROW EXECUTE FUNCTION public.gw_box_office_touch_updated_at();

ALTER TABLE public.gw_ticket_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_ticket_requests;
CREATE POLICY tenant_isolation_restrict ON public.gw_ticket_requests AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Tenant members can do everything inside their tenant. Edge functions
-- use service-role for admin operations and tighten authorization there.
DROP POLICY IF EXISTS ticket_requests_rw ON public.gw_ticket_requests;
CREATE POLICY ticket_requests_rw ON public.gw_ticket_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
