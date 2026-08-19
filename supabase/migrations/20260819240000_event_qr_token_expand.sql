-- gw_events.event_qr_token is a plain column on a table anon can read, so the
-- check-in token for every public event was retrievable with a bare curl:
--
--   curl "https://supabase.gleeworld.org/rest/v1/gw_events?select=*" \
--        -H "apikey: <anon>" -H "x-tenant-slug: lykehouse"
--
-- process_event_token_checkin already requires auth, a matching tenant, and a
-- time window, so this is not anonymous check-in — but any signed-in member
-- could read the token and mark themselves present from anywhere during the
-- window, without the QR code and without attending. For the Bowman Scholars
-- that is the control their stipends are disbursed against.
--
-- EXPAND phase: move the token to its own RLS-protected table and route all
-- readers through SECURITY DEFINER functions. gw_events.event_qr_token stays
-- in place and in sync so the currently-deployed frontend keeps working; the
-- column is dropped in the follow-up CONTRACT migration, which must not be
-- applied until the new build is live.

CREATE TABLE IF NOT EXISTS public.gw_event_qr_tokens (
  event_id   uuid PRIMARY KEY REFERENCES public.gw_events(id) ON DELETE CASCADE,
  token      uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id  uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_event_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Backfill, preserving existing tokens so QR codes already printed or shared
-- keep working.
INSERT INTO public.gw_event_qr_tokens (event_id, token, tenant_id)
SELECT id, event_qr_token, tenant_id
  FROM public.gw_events
 WHERE event_qr_token IS NOT NULL
ON CONFLICT (event_id) DO NOTHING;

-- Only instructors and admins may read a raw token. No anon policy at all.
DROP POLICY IF EXISTS "Instructors and admins can view event qr tokens"
  ON public.gw_event_qr_tokens;
CREATE POLICY "Instructors and admins can view event qr tokens"
  ON public.gw_event_qr_tokens
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_instructor_or_admin(auth.uid())
         OR public.is_current_user_admin_or_super_admin())
  );

REVOKE ALL ON public.gw_event_qr_tokens FROM anon;
GRANT SELECT ON public.gw_event_qr_tokens TO authenticated;

-- Keep the new table populated for events created by the old code path.
CREATE OR REPLACE FUNCTION public.sync_event_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gw_event_qr_tokens (event_id, token, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.event_qr_token, gen_random_uuid()), NEW.tenant_id)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_qr_token ON public.gw_events;
CREATE TRIGGER trg_sync_event_qr_token
  AFTER INSERT ON public.gw_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_qr_token();

-- Check-in now resolves the token from the protected table. Behaviour is
-- otherwise identical to 20260610120000: auth required, tenant must match,
-- window opens 2h before start and closes 2h after end (or start + 4h).
CREATE OR REPLACE FUNCTION public.process_event_token_checkin(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_user_id uuid;
  v_event record;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_inserted_id uuid;
begin
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED',
      'message', 'You must be signed in to check in.');
  END IF;

  SELECT e.id, e.title, e.start_date, e.end_date, e.location, e.tenant_id
  INTO v_event
  FROM gw_event_qr_tokens t
  JOIN gw_events e ON e.id = t.event_id
  WHERE t.token = p_token;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN',
      'message', 'Event not found or link has expired.');
  END IF;

  IF v_event.tenant_id IS DISTINCT FROM current_tenant_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'WRONG_TENANT',
      'message', 'This check-in link belongs to a different organization.');
  END IF;

  v_window_start := v_event.start_date - interval '2 hours';
  v_window_end := COALESCE(v_event.end_date, v_event.start_date + interval '4 hours') + interval '2 hours';

  IF now() < v_window_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOO_EARLY',
      'message', 'Check-in opens 2 hours before the event starts.',
      'event_title', v_event.title, 'starts_at', v_event.start_date);
  END IF;

  IF now() > v_window_end THEN
    RETURN jsonb_build_object('success', false, 'error', 'WINDOW_CLOSED',
      'message', 'Check-in for this event has closed.',
      'event_title', v_event.title);
  END IF;

  INSERT INTO gw_event_attendance (event_id, user_id, attendance_status, check_in_time, tenant_id)
  VALUES (v_event.id, v_user_id, 'present', now(), v_event.tenant_id)
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'already_recorded', true,
      'message', 'You''re already checked in!', 'event_title', v_event.title);
  END IF;

  RETURN jsonb_build_object('success', true, 'already_recorded', false,
    'message', 'Successfully checked in!', 'event_title', v_event.title);
end;
$$;

REVOKE ALL ON FUNCTION public.process_event_token_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_event_token_checkin(uuid) TO authenticated;

-- Replaces EventCheckinPage's direct `.eq('event_qr_token', token)` lookup,
-- which needed SELECT on the column to filter by it. Returns display fields
-- only — never the token — and only within the caller's tenant.
CREATE OR REPLACE FUNCTION public.get_checkin_event_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_event record;
begin
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT e.id, e.title, e.start_date, e.end_date, e.location, e.description, e.tenant_id
  INTO v_event
  FROM gw_event_qr_tokens t
  JOIN gw_events e ON e.id = t.event_id
  WHERE t.token = p_token;

  IF v_event IS NULL OR v_event.tenant_id IS DISTINCT FROM current_tenant_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN');
  END IF;

  RETURN jsonb_build_object('success', true, 'event', jsonb_build_object(
    'id', v_event.id, 'title', v_event.title, 'start_date', v_event.start_date,
    'end_date', v_event.end_date, 'location', v_event.location,
    'description', v_event.description));
end;
$$;

REVOKE ALL ON FUNCTION public.get_checkin_event_by_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_event_by_token(uuid) TO authenticated;

DO $$
DECLARE v_events int; v_tokens int;
BEGIN
  SELECT count(*) INTO v_events FROM public.gw_events WHERE event_qr_token IS NOT NULL;
  SELECT count(*) INTO v_tokens FROM public.gw_event_qr_tokens;
  RAISE NOTICE 'qr token backfill: % events, % token rows', v_events, v_tokens;
  IF v_tokens < v_events THEN
    RAISE EXCEPTION 'backfill incomplete: % of % events have tokens', v_tokens, v_events;
  END IF;
END;
$$;
