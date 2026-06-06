-- Phase 10: messenger Phase 3 — link groups to calendar events + in-chat RSVPs.
-- Polls reuse existing gw_polls / gw_poll_options / gw_poll_votes.
-- Voice notes reuse message_type='audio' + file_url on gw_group_messages.

BEGIN;

ALTER TABLE public.gw_message_groups
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.gw_events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_message_groups_event_idx ON public.gw_message_groups(event_id);

-- Lightweight chat-RSVP table that keys off auth.users to avoid the
-- profile-id mismatch that breaks gw_event_rsvps.
CREATE TABLE IF NOT EXISTS public.gw_chat_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  message_id uuid NOT NULL REFERENCES public.gw_group_messages(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.gw_events(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('yes','no','maybe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);
CREATE INDEX IF NOT EXISTS gw_chat_rsvps_message_idx ON public.gw_chat_rsvps(message_id);
CREATE INDEX IF NOT EXISTS gw_chat_rsvps_tenant_idx ON public.gw_chat_rsvps(tenant_id);

DROP TRIGGER IF EXISTS set_tenant_id ON public.gw_chat_rsvps;
CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.gw_chat_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_jwt();

ALTER TABLE public.gw_chat_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_chat_rsvps;
CREATE POLICY tenant_isolation_restrict ON public.gw_chat_rsvps AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS self_manage ON public.gw_chat_rsvps;
CREATE POLICY self_manage ON public.gw_chat_rsvps FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS members_read ON public.gw_chat_rsvps;
CREATE POLICY members_read ON public.gw_chat_rsvps FOR SELECT TO authenticated
  USING (message_id IN (
    SELECT gm.id FROM gw_group_messages gm
    JOIN gw_group_members mem ON mem.group_id = gm.group_id
    WHERE mem.user_id = auth.uid()
  ));

-- Allow voice messages on the existing message_type check (it already includes 'audio').

COMMIT;
