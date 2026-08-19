-- Per-invite date windows.
--
-- Slots were always computed as "today forward N days", which is right for
-- someone you want to see this week and wrong for everyone else. Darius Lim
-- (Voices of Singapore) asked for October and is travelling until then;
-- offering him tomorrow morning is noise. Kyra, Annika and anyone else with a
-- known absence have the same shape of problem.
--
-- So an invite can carry its own window. Outside it, the invitee sees nothing
-- and the booking RPC refuses — the window is enforced server-side, not just
-- reflected in the UI, because the deep links in the email are guessable dates.

ALTER TABLE public.gw_booking_invites
  ADD COLUMN IF NOT EXISTS window_start DATE,
  ADD COLUMN IF NOT EXISTS window_end   DATE;

COMMENT ON COLUMN public.gw_booking_invites.window_start IS
  'Earliest bookable date for this invite. NULL = from today.';
COMMENT ON COLUMN public.gw_booking_invites.window_end IS
  'Latest bookable date for this invite. NULL = today + p_days.';

-- ── Slots, clamped to the invite window ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_invite_available_slots(
  p_token text,
  p_days integer DEFAULT 21
)
RETURNS TABLE(slot_date date, start_time time, end_time time, available boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.gw_booking_invites;
  today DATE;
  day_cursor DATE;
  last_day DATE;
BEGIN
  inv := public.gw_resolve_invite(p_token);
  IF inv.id IS NULL THEN
    RETURN;
  END IF;

  today := (now() AT TIME ZONE 'America/New_York')::DATE;

  -- Never before today, whatever the window says.
  day_cursor := GREATEST(today, COALESCE(inv.window_start, today));

  -- When a window end exists it wins outright, so a far-future window is
  -- reachable without the caller having to guess a large p_days.
  IF inv.window_end IS NOT NULL THEN
    last_day := inv.window_end;
  ELSE
    last_day := today + (least(greatest(coalesce(p_days, 21), 1), 90) || ' days')::INTERVAL;
  END IF;

  WHILE day_cursor <= last_day LOOP
    RETURN QUERY
      SELECT day_cursor, s.start_time, s.end_time, s.available
        FROM public.get_available_time_slots(inv.service_id, day_cursor, NULL) s
       WHERE s.available = true;
    day_cursor := day_cursor + 1;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_invite_available_slots(text, integer) TO anon, authenticated;

-- ── Creation helper accepts a window ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_booking_invite(
  p_service_id uuid,
  p_invitee_name text,
  p_invitee_email text,
  p_campaign text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30,
  p_window_start date DEFAULT NULL,
  p_window_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_token TEXT;
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gw_services WHERE id = p_service_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or inactive');
  END IF;

  IF coalesce(trim(p_invitee_email), '') = '' OR p_invitee_email NOT LIKE '%@%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid invitee email is required');
  END IF;

  IF p_window_start IS NOT NULL AND p_window_end IS NOT NULL AND p_window_end < p_window_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'Window end is before window start');
  END IF;

  new_token := public.gw_generate_invite_token();

  INSERT INTO public.gw_booking_invites (
    token, service_id, invitee_name, invitee_email, campaign, message,
    expires_at, created_by, window_start, window_end
  ) VALUES (
    new_token,
    p_service_id,
    coalesce(nullif(trim(p_invitee_name), ''), split_part(p_invitee_email, '@', 1)),
    lower(trim(p_invitee_email)),
    nullif(trim(p_campaign), ''),
    nullif(trim(p_message), ''),
    -- A link for an October window must outlive a 30-day default.
    GREATEST(
      now() + (greatest(coalesce(p_expires_in_days, 30), 1) || ' days')::INTERVAL,
      COALESCE(p_window_end + 1, now())
    ),
    auth.uid(),
    p_window_start,
    p_window_end
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object('success', true, 'invite_id', new_id, 'token', new_token);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_booking_invite(uuid, text, text, text, text, integer, date, date) TO authenticated;

-- ── Booking respects the window ──────────────────────────────────────────
-- The email carries ?d=<date> deep links, so a recipient could hand-edit one
-- to a date outside their window. Refuse it here rather than trusting the page.
CREATE OR REPLACE FUNCTION public.gw_invite_date_in_window(p_token text, p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(p_date >= i.window_start, true)
     AND COALESCE(p_date <= i.window_end, true)
    FROM public.gw_booking_invites i
   WHERE i.token = p_token;
$function$;

-- Rebuild the booking RPC with the window check wired in, immediately after
-- the invite resolves and before anything is claimed or written.
CREATE OR REPLACE FUNCTION public.book_appointment_with_invite(
  p_token text,
  p_appointment_date date,
  p_start_time time,
  p_notes text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.gw_booking_invites;
  service_record RECORD;
  availability_check JSONB;
  new_appointment_id UUID;
  appointment_timestamp TIMESTAMPTZ;
  resolved_type text;
  resolved_instructor uuid;
  resolved_tenant uuid;
  rows_claimed integer;
BEGIN
  inv := public.gw_resolve_invite(p_token);
  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_invite',
      'error', 'This invitation link is no longer valid.');
  END IF;

  IF NOT public.gw_invite_date_in_window(p_token, p_appointment_date) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'outside_window',
      'error', 'That date is outside the range this invitation covers.');
  END IF;

  SELECT * INTO service_record
    FROM public.gw_services WHERE id = inv.service_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'service_inactive',
      'error', 'This meeting type is no longer available.');
  END IF;

  resolved_tenant := COALESCE(inv.tenant_id, service_record.tenant_id);

  availability_check := public.check_appointment_availability(
    inv.service_id, p_appointment_date, p_start_time, service_record.duration_minutes
  );

  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'slot_taken',
      'error', coalesce(availability_check->>'error', 'That time was just taken.'));
  END IF;

  UPDATE public.gw_booking_invites
     SET booked_at = now(), updated_at = now()
   WHERE id = inv.id AND booked_at IS NULL;
  GET DIAGNOSTICS rows_claimed = ROW_COUNT;

  IF rows_claimed = 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_booked',
      'error', 'This invitation has already been used to book a time.');
  END IF;

  appointment_timestamp := (p_appointment_date::text || ' ' || p_start_time::text)::timestamp
                           AT TIME ZONE 'America/New_York';

  resolved_type := CASE
    WHEN service_record.category = 'general' THEN 'general'
    WHEN service_record.category = 'coaching' THEN 'voice-lesson'
    WHEN service_record.category = 'education' THEN 'tutorial'
    WHEN service_record.category = 'rehearsal' THEN 'rehearsal'
    WHEN service_record.category = 'styling' THEN 'Wardrobe Fitting'
    WHEN service_record.category = 'accompaniment' THEN 'consultation'
    ELSE 'other'
  END;

  resolved_instructor := service_record.created_by;
  IF resolved_instructor IS NULL AND service_record.provider_id IS NOT NULL THEN
    SELECT user_id INTO resolved_instructor
      FROM public.gw_service_providers WHERE id = service_record.provider_id;
  END IF;

  INSERT INTO public.gw_appointments (
    title, description, appointment_date, duration_minutes, status, appointment_type,
    client_name, client_email, client_phone, notes,
    created_by, service_id, instructor_user_id, assigned_to, tenant_id
  ) VALUES (
    service_record.name || ' - ' || inv.invitee_name,
    p_notes, appointment_timestamp, service_record.duration_minutes,
    CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    resolved_type, inv.invitee_name, inv.invitee_email, p_phone, p_notes,
    inv.created_by, inv.service_id, resolved_instructor, resolved_instructor, resolved_tenant
  ) RETURNING id INTO new_appointment_id;

  UPDATE public.gw_booking_invites
     SET appointment_id = new_appointment_id,
         invitee_phone = nullif(trim(coalesce(p_phone, '')), ''),
         updated_at = now()
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true, 'appointment_id', new_appointment_id,
    'status', CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    'service_name', service_record.name, 'location', service_record.location,
    'duration_minutes', service_record.duration_minutes,
    'appointment_date', p_appointment_date, 'start_time', p_start_time,
    'message', CASE
      WHEN service_record.requires_approval THEN 'Your request was submitted for confirmation.'
      ELSE 'Your meeting is confirmed.'
    END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.book_appointment_with_invite(text, date, time, text, text) TO anon, authenticated;
