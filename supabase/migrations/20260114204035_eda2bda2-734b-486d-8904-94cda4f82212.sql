-- Fix the process_qr_attendance_scan function to use correct column name
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param TEXT,
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_event RECORD;
  v_existing_attendance RECORD;
  v_scan_id UUID;
  v_attendance_id UUID;
  v_result JSONB;
BEGIN
  -- Find the QR code record
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE token = qr_token_param
  AND is_active = true;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or inactive QR code'
    );
  END IF;

  -- Check if QR code has expired
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QR code has expired'
    );
  END IF;

  -- Get event details
  SELECT * INTO v_event
  FROM events
  WHERE id = v_qr_record.event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;

  -- Check for existing attendance
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id
  AND user_id = user_id_param;

  IF v_existing_attendance IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attendance already recorded for this event',
      'existing_status', v_existing_attendance.status
    );
  END IF;

  -- Record the QR scan (using user_id, not scanned_by)
  INSERT INTO gw_attendance_qr_scans (
    qr_code_id,
    user_id,
    scan_location,
    user_agent,
    ip_address
  ) VALUES (
    v_qr_record.id,
    user_id_param,
    scan_location_param,
    user_agent_param,
    ip_address_param::inet
  ) RETURNING id INTO v_scan_id;

  -- Update scan count
  UPDATE gw_attendance_qr_codes
  SET scan_count = COALESCE(scan_count, 0) + 1,
      last_scanned_at = NOW()
  WHERE id = v_qr_record.id;

  -- Record attendance
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes
  ) VALUES (
    v_qr_record.event_id,
    user_id_param,
    'present',
    'Checked in via QR code scan'
  ) RETURNING id INTO v_attendance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'scan_id', v_scan_id,
    'attendance_id', v_attendance_id,
    'event_title', v_event.title,
    'event_date', v_event.start_date
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Fix the process_pin_attendance_scan function to use correct column name
CREATE OR REPLACE FUNCTION public.process_pin_attendance_scan(
  pin_code_param TEXT,
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_event RECORD;
  v_existing_attendance RECORD;
  v_scan_id UUID;
  v_attendance_id UUID;
BEGIN
  -- Find the QR code record by PIN
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE pin_code = pin_code_param
  AND is_active = true;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or inactive PIN code'
    );
  END IF;

  -- Check if PIN code has expired
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN code has expired'
    );
  END IF;

  -- Get event details
  SELECT * INTO v_event
  FROM events
  WHERE id = v_qr_record.event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;

  -- Check for existing attendance
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id
  AND user_id = user_id_param;

  IF v_existing_attendance IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attendance already recorded for this event',
      'existing_status', v_existing_attendance.status
    );
  END IF;

  -- Record the scan (using user_id, not scanned_by)
  INSERT INTO gw_attendance_qr_scans (
    qr_code_id,
    user_id,
    scan_location
  ) VALUES (
    v_qr_record.id,
    user_id_param,
    scan_location_param
  ) RETURNING id INTO v_scan_id;

  -- Update scan count
  UPDATE gw_attendance_qr_codes
  SET scan_count = COALESCE(scan_count, 0) + 1,
      last_scanned_at = NOW()
  WHERE id = v_qr_record.id;

  -- Record attendance
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes
  ) VALUES (
    v_qr_record.event_id,
    user_id_param,
    'present',
    'Checked in via PIN code'
  ) RETURNING id INTO v_attendance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'scan_id', v_scan_id,
    'attendance_id', v_attendance_id,
    'event_title', v_event.title,
    'event_date', v_event.start_date
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;