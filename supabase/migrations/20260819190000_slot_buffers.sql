-- Buffers between meetings, and a fix for a booking window nobody could use.
--
-- 1. gw_services.booking_buffer_minutes has existed since the table was
--    created and has never been read. Slots were offered back-to-back, so an
--    interview that runs long collides with the next one.
--
--    The buffer widens the CONFLICT test, not the slot grid: start times stay
--    on clean :00/:30 boundaries, but an existing booking now reserves
--    buffer minutes of quiet either side of itself.
--
-- 2. advance_booking_days defaulted to 30, and check_appointment_availability
--    rejects anything beyond it. The Singapore invite has a 21 Sep – 11 Oct
--    window, which is 33-53 days out: every slot rendered fine and every
--    booking would have failed with "too far in advance". Invites with an
--    explicit window are the deliberate exception, so the limit now yields to
--    the invite's own window end.
--
-- Everything else in check_appointment_availability — the availability-window
-- test, the same-service conflict rule, the past-date guard — is preserved
-- exactly as it was.

-- ── Slot generation, padded by the buffer ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_service_id uuid,
  p_date date,
  p_duration_override integer DEFAULT NULL
)
RETURNS TABLE(start_time time, end_time time, available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    service_duration integer;
    slot_duration integer;
    buffer_minutes integer;
    day_of_week_param integer;
    avail_rec RECORD;
    slot_start time;
    slot_end time;
    current_et TIMESTAMPTZ;
    current_date_et DATE;
    current_time_et TIME;
    is_booked boolean;
BEGIN
    day_of_week_param := EXTRACT(DOW FROM p_date);

    current_et := NOW() AT TIME ZONE 'America/New_York';
    current_date_et := current_et::DATE;
    current_time_et := current_et::TIME;

    SELECT s.duration_minutes, COALESCE(s.booking_buffer_minutes, 0)
      INTO service_duration, buffer_minutes
      FROM gw_services s
     WHERE s.id = p_service_id;

    IF service_duration IS NULL THEN
        RETURN;
    END IF;

    slot_duration := COALESCE(p_duration_override, service_duration);

    FOR avail_rec IN
        SELECT sa.start_time as window_start, sa.end_time as window_end
        FROM gw_service_availability sa
        WHERE sa.service_id = p_service_id
          AND sa.day_of_week = day_of_week_param
          AND sa.is_active = true
        ORDER BY sa.start_time
    LOOP
        slot_start := avail_rec.window_start;

        WHILE slot_start + (slot_duration || ' minutes')::INTERVAL <= avail_rec.window_end LOOP
            slot_end := slot_start + (slot_duration || ' minutes')::INTERVAL;

            IF p_date = current_date_et AND slot_start < current_time_et THEN
                slot_start := slot_start + (slot_duration || ' minutes')::INTERVAL;
                CONTINUE;
            END IF;

            SELECT EXISTS (
                SELECT 1 FROM gw_appointments ga
                WHERE ga.appointment_date::date = p_date
                  AND ga.status NOT IN ('cancelled')
                  AND (ga.appointment_date AT TIME ZONE 'America/New_York')::time
                      - (buffer_minutes || ' minutes')::INTERVAL < slot_end
                  AND (ga.appointment_date AT TIME ZONE 'America/New_York')::time
                      + (COALESCE(ga.duration_minutes, slot_duration) + buffer_minutes || ' minutes')::INTERVAL > slot_start
            ) INTO is_booked;

            start_time := slot_start;
            end_time := slot_end;
            available := NOT is_booked;
            RETURN NEXT;

            slot_start := slot_end;
        END LOOP;
    END LOOP;
END;
$function$;

-- ── Write-time guard: same checks, plus buffer, minus the window trap ────
CREATE OR REPLACE FUNCTION public.check_appointment_availability(
  p_service_id uuid,
  p_appointment_date date,
  p_start_time time without time zone,
  p_duration_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_record RECORD;
  availability_exists BOOLEAN := false;
  conflicts_exist BOOLEAN := false;
  calc_end_time TIME;
  day_of_week_param INTEGER;
  buffer_minutes INTEGER;
  max_window_end DATE;
  current_et TIMESTAMPTZ;
  current_date_et DATE;
  current_time_et TIME;
BEGIN
  calc_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;

  current_et := NOW() AT TIME ZONE 'America/New_York';
  current_date_et := current_et::DATE;
  current_time_et := current_et::TIME;

  day_of_week_param := EXTRACT(DOW FROM p_appointment_date);

  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service not found or inactive');
  END IF;

  buffer_minutes := COALESCE(service_record.booking_buffer_minutes, 0);

  SELECT EXISTS (
    SELECT 1 FROM public.gw_service_availability sa
    WHERE sa.service_id = p_service_id
    AND sa.day_of_week = day_of_week_param
    AND sa.is_active = true
    AND p_start_time >= sa.start_time
    AND calc_end_time <= sa.end_time
  ) INTO availability_exists;

  IF NOT availability_exists THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service is not available at the requested time');
  END IF;

  -- Conflict rule unchanged (same service only), now padded by the buffer.
  SELECT EXISTS (
    SELECT 1 FROM public.gw_appointments a
    WHERE a.appointment_date::date = p_appointment_date
    AND a.status IN ('confirmed', 'pending')
    AND a.appointment_type = (SELECT name FROM public.gw_services WHERE id = p_service_id)
    AND (
      p_start_time < (a.appointment_date AT TIME ZONE 'America/New_York')::time
                     + (COALESCE(a.duration_minutes, 30) + buffer_minutes || ' minutes')::INTERVAL
      AND calc_end_time > (a.appointment_date AT TIME ZONE 'America/New_York')::time
                          - (buffer_minutes || ' minutes')::INTERVAL
    )
  ) INTO conflicts_exist;

  IF conflicts_exist THEN
    RETURN jsonb_build_object('available', false, 'error', 'Time slot is already booked');
  END IF;

  -- Advance-booking limit, unless an unused invite explicitly opens a window
  -- that reaches further out. Without this, any invite window beyond
  -- advance_booking_days shows bookable slots that always fail on submit.
  SELECT MAX(i.window_end) INTO max_window_end
    FROM public.gw_booking_invites i
   WHERE i.service_id = p_service_id
     AND i.booked_at IS NULL
     AND i.revoked_at IS NULL
     AND i.expires_at > now()
     AND i.window_end IS NOT NULL
     AND p_appointment_date BETWEEN COALESCE(i.window_start, current_date_et) AND i.window_end;

  IF p_appointment_date > current_date_et + (service_record.advance_booking_days || ' days')::INTERVAL
     AND (max_window_end IS NULL OR p_appointment_date > max_window_end) THEN
    RETURN jsonb_build_object('available', false, 'error', 'Appointment date is too far in advance');
  END IF;

  IF p_appointment_date < current_date_et OR
     (p_appointment_date = current_date_et AND p_start_time < current_time_et) THEN
    RETURN jsonb_build_object('available', false, 'error', 'Cannot book appointments in the past');
  END IF;

  RETURN jsonb_build_object('available', true, 'service', row_to_json(service_record));
END;
$function$;

-- 10 minutes between interviews so a conversation that runs over does not
-- collide with the next conductor.
UPDATE public.gw_services
   SET booking_buffer_minutes = 10
 WHERE id = 'c4e20569-b3e2-4c7d-9b4b-1783517f00f3';
