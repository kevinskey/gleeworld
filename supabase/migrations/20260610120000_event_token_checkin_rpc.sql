-- Server-side event check-in: validates the QR token and the event time
-- window before recording attendance. Replaces the direct client insert in
-- EventCheckinPage, which let anyone with a token (or a guessed event_id)
-- mark themselves present at any time.

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

  SELECT id, title, start_date, end_date, location, tenant_id
  INTO v_event
  FROM gw_events
  WHERE event_qr_token = p_token;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TOKEN',
      'message', 'Event not found or link has expired.');
  END IF;

  IF v_event.tenant_id IS DISTINCT FROM current_tenant_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'WRONG_TENANT',
      'message', 'This check-in link belongs to a different organization.');
  END IF;

  -- Check-in window: opens 2 hours before start, closes 2 hours after the
  -- event ends (or 6 hours after start when no end time is set).
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
