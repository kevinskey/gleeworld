-- Update process_qr_attendance_scan to check BOTH qr_attendance_tokens and gw_attendance_qr_codes
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
  v_grace_period_seconds INTEGER := 120; -- 2 minute grace period
  v_source_table TEXT;
BEGIN
  -- FIRST: Check the newer gw_attendance_qr_codes table
  SELECT *, 'gw_attendance_qr_codes'::text as source INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = qr_token_param
    AND is_active = true;

  -- If not found as active in gw_attendance_qr_codes, check recently expired ones
  IF v_qr_record IS NULL THEN
    SELECT *, 'gw_attendance_qr_codes'::text as source INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE qr_token = qr_token_param
      AND expires_at > (NOW() - (v_grace_period_seconds || ' seconds')::interval);
  END IF;

  -- SECOND: Check the older qr_attendance_tokens table
  IF v_qr_record IS NULL THEN
    SELECT 
      id,
      event_id,
      token as qr_token,
      is_active,
      expires_at,
      scan_count,
      max_scans,
      created_by as generated_by,
      created_at,
      'qr_attendance_tokens'::text as source
    INTO v_qr_record
    FROM qr_attendance_tokens
    WHERE token = qr_token_param
      AND is_active = true;
  END IF;

  -- Check recently expired tokens in qr_attendance_tokens
  IF v_qr_record IS NULL THEN
    SELECT 
      id,
      event_id,
      token as qr_token,
      is_active,
      expires_at,
      scan_count,
      max_scans,
      created_by as generated_by,
      created_at,
      'qr_attendance_tokens'::text as source
    INTO v_qr_record
    FROM qr_attendance_tokens
    WHERE token = qr_token_param
      AND expires_at > (NOW() - (v_grace_period_seconds || ' seconds')::interval);
  END IF;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive QR code',
      'error', 'QR_INVALID'
    );
  END IF;

  -- Check if QR code has expired (beyond grace period)
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < (NOW() - (v_grace_period_seconds || ' seconds')::interval) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired. Please ask your instructor for a new code.',
      'error', 'QR_EXPIRED',
      'expired_at', v_qr_record.expires_at
    );
  END IF;

  -- Check max scans limit (if applicable)
  IF v_qr_record.max_scans IS NOT NULL AND v_qr_record.scan_count >= v_qr_record.max_scans THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has reached maximum scan limit',
      'error', 'MAX_SCANS_REACHED'
    );
  END IF;

  -- Get event details from gw_events (primary) or events table
  SELECT * INTO v_event
  FROM gw_events
  WHERE id = v_qr_record.event_id;
  
  IF v_event IS NULL THEN
    SELECT * INTO v_event
    FROM events
    WHERE id = v_qr_record.event_id;
  END IF;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Event not found',
      'error', 'EVENT_NOT_FOUND'
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
      'error', 'ALREADY_RECORDED',
      'existing_status', v_existing_attendance.status,
      'recorded_at', v_existing_attendance.recorded_at
    );
  END IF;

  -- Record the QR scan based on source table
  IF v_qr_record.source = 'gw_attendance_qr_codes' THEN
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
      CASE WHEN ip_address_param IS NOT NULL AND ip_address_param != '' 
           THEN ip_address_param::inet 
           ELSE NULL 
      END
    ) RETURNING id INTO v_scan_id;

    -- Update scan count in gw_attendance_qr_codes
    UPDATE gw_attendance_qr_codes
    SET scan_count = COALESCE(scan_count, 0) + 1,
        updated_at = NOW()
    WHERE id = v_qr_record.id;
  ELSE
    -- Update scan count in qr_attendance_tokens
    UPDATE qr_attendance_tokens
    SET scan_count = COALESCE(scan_count, 0) + 1
    WHERE id = v_qr_record.id;
    
    v_scan_id := gen_random_uuid();
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
    'Checked in via QR code scan',
    NOW()
  ) RETURNING id INTO v_attendance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'attendance_id', v_attendance_id,
    'scan_id', v_scan_id,
    'event_title', v_event.title,
    'status', 'present'
  );
END;
$$;