-- Drop ALL existing versions of the functions
DROP FUNCTION IF EXISTS process_qr_attendance_scan(text, uuid, text, text, inet);
DROP FUNCTION IF EXISTS process_qr_attendance_scan(text, uuid, jsonb, text, inet);
DROP FUNCTION IF EXISTS process_qr_attendance_scan(text, uuid, jsonb, text, text);
DROP FUNCTION IF EXISTS process_pin_attendance_scan(character varying, uuid, jsonb, text);
DROP FUNCTION IF EXISTS process_pin_attendance_scan(text, uuid, jsonb);

-- Recreate process_qr_attendance_scan with security validation
CREATE FUNCTION process_qr_attendance_scan(
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
  v_scan_id UUID;
  v_attendance_id UUID;
  v_existing_attendance RECORD;
  v_security_result JSONB;
  v_user_lat DECIMAL(10, 8) := NULL;
  v_user_lng DECIMAL(11, 8) := NULL;
BEGIN
  -- Find the QR code
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = qr_token_param AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired QR code',
      'error', 'QR code not found or inactive'
    );
  END IF;

  -- Check expiration
  IF v_qr_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired',
      'error', 'Please ask instructor for new code'
    );
  END IF;

  -- Extract user location from scan_location_param if provided
  IF scan_location_param IS NOT NULL THEN
    v_user_lat := (scan_location_param->>'latitude')::DECIMAL(10, 8);
    v_user_lng := (scan_location_param->>'longitude')::DECIMAL(11, 8);
  END IF;

  -- Run security validation
  v_security_result := validate_attendance_security(v_qr_record.id, v_user_lat, v_user_lng);
  
  IF NOT (v_security_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_security_result->>'error',
      'error', v_security_result->>'error_code'
    );
  END IF;

  -- Get event info
  SELECT * INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;

  -- Check for existing attendance
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already marked present',
      'event_title', v_event.title,
      'already_recorded', true
    );
  END IF;

  -- Record the scan
  INSERT INTO gw_attendance_qr_scans (
    qr_code_id,
    scanned_by,
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
  SET scan_count = scan_count + 1 
  WHERE id = v_qr_record.id;

  -- Create attendance record
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes
  ) VALUES (
    v_qr_record.event_id,
    user_id_param,
    'present',
    'Checked in via QR code'
  ) RETURNING id INTO v_attendance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'event_title', v_event.title,
    'scanned_at', NOW()
  );
END;
$$;

-- Recreate process_pin_attendance_scan with security validation
CREATE FUNCTION process_pin_attendance_scan(
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
  v_scan_id UUID;
  v_attendance_id UUID;
  v_existing_attendance RECORD;
  v_security_result JSONB;
  v_user_lat DECIMAL(10, 8) := NULL;
  v_user_lng DECIMAL(11, 8) := NULL;
BEGIN
  -- Find the QR code by PIN
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE pin_code = pin_code_param AND is_active = true AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired PIN code',
      'error', 'PIN not found or expired'
    );
  END IF;

  -- Extract user location
  IF scan_location_param IS NOT NULL THEN
    v_user_lat := (scan_location_param->>'latitude')::DECIMAL(10, 8);
    v_user_lng := (scan_location_param->>'longitude')::DECIMAL(11, 8);
  END IF;

  -- Run security validation
  v_security_result := validate_attendance_security(v_qr_record.id, v_user_lat, v_user_lng);
  
  IF NOT (v_security_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_security_result->>'error',
      'error', v_security_result->>'error_code'
    );
  END IF;

  -- Get event info
  SELECT * INTO v_event FROM gw_events WHERE id = v_qr_record.event_id;

  -- Check for existing attendance
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_qr_record.event_id AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already marked present',
      'event_title', v_event.title,
      'already_recorded', true
    );
  END IF;

  -- Record the scan
  INSERT INTO gw_attendance_qr_scans (
    qr_code_id,
    scanned_by,
    scan_location
  ) VALUES (
    v_qr_record.id,
    user_id_param,
    scan_location_param
  ) RETURNING id INTO v_scan_id;

  -- Update scan count
  UPDATE gw_attendance_qr_codes 
  SET scan_count = scan_count + 1 
  WHERE id = v_qr_record.id;

  -- Create attendance record
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
    'event_title', v_event.title,
    'scanned_at', NOW()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_qr_attendance_scan TO authenticated;
GRANT EXECUTE ON FUNCTION process_pin_attendance_scan TO authenticated;