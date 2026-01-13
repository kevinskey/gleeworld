-- Fix the process_pin_attendance_scan function to match actual table schema
CREATE OR REPLACE FUNCTION public.process_pin_attendance_scan(
  pin_code_param VARCHAR(6),
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_event_record RECORD;
  v_existing_attendance RECORD;
  v_user_profile RECORD;
  v_attendance_id UUID;
BEGIN
  -- Validate inputs
  IF pin_code_param IS NULL OR LENGTH(pin_code_param) != 6 OR user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid PIN code format. Please enter a 6-digit code.',
      'error_code', 'INVALID_INPUT'
    );
  END IF;

  -- Get user profile for name
  SELECT full_name, email INTO v_user_profile
  FROM gw_profiles
  WHERE user_id = user_id_param;

  -- Validate PIN code and get QR code record
  SELECT id, qr_token, event_id, generated_by, expires_at, is_active, scan_count
  INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE pin_code = pin_code_param
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired PIN code. Please ask your instructor for a new code.',
      'error_code', 'INVALID_PIN'
    );
  END IF;

  -- Get event details
  SELECT id, title, start_date, event_type, location
  INTO v_event_record
  FROM gw_events
  WHERE id = v_qr_record.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found',
      'error_code', 'EVENT_NOT_FOUND'
    );
  END IF;

  -- Check if attendance already exists
  SELECT id, status, notes, recorded_at
  INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id
    AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already checked in for this event',
      'error_code', 'DUPLICATE_ATTENDANCE',
      'event', jsonb_build_object(
        'id', v_event_record.id,
        'title', v_event_record.title,
        'start_date', v_event_record.start_date
      ),
      'existing_status', v_existing_attendance.status,
      'recorded_at', v_existing_attendance.recorded_at
    );
  END IF;

  -- Record attendance
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes,
    recorded_at
  ) VALUES (
    v_qr_record.event_id,
    user_id_param,
    'present',
    'Checked in via PIN code: ' || pin_code_param,
    now()
  )
  RETURNING id INTO v_attendance_id;

  -- Update scan count on QR code
  UPDATE gw_attendance_qr_codes 
  SET scan_count = scan_count + 1
  WHERE id = v_qr_record.id;

  -- Log the scan in gw_attendance_qr_scans (matching actual schema)
  INSERT INTO gw_attendance_qr_scans (
    qr_code_id,
    user_id,
    scanned_at,
    scan_location,
    user_agent
  ) VALUES (
    v_qr_record.id,
    user_id_param,
    now(),
    scan_location_param,
    user_agent_param
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully checked in!',
    'attendance_id', v_attendance_id,
    'event', jsonb_build_object(
      'id', v_event_record.id,
      'title', v_event_record.title,
      'start_date', v_event_record.start_date,
      'event_type', v_event_record.event_type,
      'location', v_event_record.location
    ),
    'user_name', COALESCE(v_user_profile.full_name, 'Member'),
    'checked_in_at', now()
  );
END;
$$;