-- Fix column name: table uses 'qr_token' not 'token'
-- Also fix 'last_scanned_at' which doesn't exist in the table

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
BEGIN
  -- Find the QR code record (column is qr_token, not token)
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = qr_token_param
    AND is_active = true;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive QR code',
      'error', 'Invalid or inactive QR code'
    );
  END IF;

  -- Check if QR code has expired
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired',
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
      'message', 'Event not found',
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
      'message', 'Attendance already recorded for this event',
      'error', 'Attendance already recorded for this event',
      'existing_status', v_existing_attendance.status
    );
  END IF;

  -- Record the QR scan
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

  -- Update scan count (updated_at exists, not last_scanned_at)
  UPDATE gw_attendance_qr_codes
  SET scan_count = COALESCE(scan_count, 0) + 1,
      updated_at = NOW()
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
    'message', SQLERRM,
    'error', SQLERRM
  );
END;
$$;


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
      'message', 'Invalid or inactive PIN code',
      'error', 'Invalid or inactive PIN code'
    );
  END IF;

  -- Check if PIN code has expired
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'PIN code has expired',
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
      'message', 'Event not found',
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
      'message', 'Attendance already recorded for this event',
      'error', 'Attendance already recorded for this event',
      'existing_status', v_existing_attendance.status
    );
  END IF;

  -- Record the scan
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
      updated_at = NOW()
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
    'message', SQLERRM,
    'error', SQLERRM
  );
END;
$$;