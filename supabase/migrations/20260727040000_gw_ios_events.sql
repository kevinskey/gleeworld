-- Personal iPhone-calendar events, pulled by the iOS app via EventKit.
-- Mirrors gw_google_events: 2-layer RLS (tenant RESTRICTIVE + user
-- PERMISSIVE), user-scoped by apple_event_id.

CREATE TABLE public.gw_ios_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT current_tenant_id(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apple_event_id    text NOT NULL,
  calendar_title    text,
  title             text,
  description       text,
  location          text,
  start_at          timestamptz,
  end_at            timestamptz,
  all_day           boolean NOT NULL DEFAULT false,
  is_private        boolean NOT NULL DEFAULT false,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, apple_event_id)
);

CREATE OR REPLACE FUNCTION public.gw_ios_events_set_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER gw_ios_events_set_tenant_trg
BEFORE INSERT ON public.gw_ios_events
FOR EACH ROW EXECUTE FUNCTION public.gw_ios_events_set_tenant();

ALTER TABLE public.gw_ios_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_ios_events
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users see own ios events" ON public.gw_ios_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users write own ios events" ON public.gw_ios_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ios_events_service_role_rw ON public.gw_ios_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX gw_ios_events_user_start_idx
  ON public.gw_ios_events (user_id, start_at);
