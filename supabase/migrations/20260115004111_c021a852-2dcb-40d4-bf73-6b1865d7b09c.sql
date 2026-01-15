-- Fix QR code expiration: ensure expires_at uses time_window_minutes or a reasonable minimum, not just rotate_interval_seconds
-- The rotating QR system should rotate the TOKEN but the expiration should be based on the time window

CREATE OR REPLACE FUNCTION public.generate_rotating_qr_code(
  p_event_id uuid,
  p_created_by uuid,
  p_rotate_interval_seconds integer DEFAULT 60,
  p_time_window_enabled boolean DEFAULT false,
  p_time_window_minutes integer DEFAULT 15,
  p_geofence_enabled boolean DEFAULT false,
  p_geofence_latitude double precision DEFAULT NULL,
  p_geofence_longitude double precision DEFAULT NULL,
  p_geofence_radius_meters integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_id uuid;
  v_qr_token text;
  v_pin_code text;
  v_parent_id uuid;
  v_sequence integer;
  v_expires_at timestamptz;
  v_effective_expiry_minutes integer;
BEGIN
  -- Find existing parent QR or get the latest sequence
  SELECT id, COALESCE(rotation_sequence, 0) + 1
  INTO v_parent_id, v_sequence
  FROM gw_attendance_qr_codes
  WHERE event_id = p_event_id
    AND auto_rotate_enabled = true
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no parent, this is the first in the sequence
  IF v_parent_id IS NULL THEN
    v_sequence := 1;
  END IF;

  -- Deactivate previous QR codes for this event
  UPDATE gw_attendance_qr_codes
  SET is_active = false
  WHERE event_id = p_event_id AND is_active = true;

  -- Generate a secure random token
  v_qr_token := encode(gen_random_uuid()::text::bytea, 'hex') || '-' || extract(epoch from now())::text;
  
  -- Generate a 6-digit PIN code
  v_pin_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- FIX: Calculate expiration based on time_window_minutes (if enabled) or a reasonable minimum
  -- The rotation interval is for visual rotation, NOT for validity duration
  IF p_time_window_enabled AND p_time_window_minutes > 0 THEN
    v_effective_expiry_minutes := p_time_window_minutes;
  ELSE
    -- Default to at least 30 minutes for a reasonable attendance window
    v_effective_expiry_minutes := 30;
  END IF;
  
  -- Ensure minimum of 5 minutes expiry regardless of settings
  IF v_effective_expiry_minutes < 5 THEN
    v_effective_expiry_minutes := 5;
  END IF;
  
  v_expires_at := now() + (v_effective_expiry_minutes || ' minutes')::interval;

  -- Create the new QR code
  INSERT INTO gw_attendance_qr_codes (
    event_id,
    qr_token,
    generated_by,
    pin_code,
    is_active,
    auto_rotate_enabled,
    rotate_interval_seconds,
    time_window_enabled,
    time_window_minutes,
    geofence_enabled,
    geofence_latitude,
    geofence_longitude,
    geofence_radius_meters,
    parent_qr_id,
    rotation_sequence,
    expires_at
  ) VALUES (
    p_event_id,
    v_qr_token,
    p_created_by,
    v_pin_code,
    true,
    true,
    p_rotate_interval_seconds,
    p_time_window_enabled,
    p_time_window_minutes,
    p_geofence_enabled,
    p_geofence_latitude,
    p_geofence_longitude,
    p_geofence_radius_meters,
    CASE WHEN v_sequence > 1 THEN v_parent_id ELSE NULL END,
    v_sequence,
    v_expires_at
  )
  RETURNING id INTO v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_id', v_qr_id,
    'qr_token', v_qr_token,
    'pin_code', v_pin_code,
    'expires_at', v_expires_at,
    'sequence', v_sequence,
    'time_window_minutes', v_effective_expiry_minutes
  );
END;
$$;

-- Also update process_qr_attendance_scan to be more lenient with recently expired codes (grace period)
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
  v_grace_period_seconds INTEGER := 120; -- 2 minute grace period for slow scans
BEGIN
  -- Find the QR code record - check active codes first, then recently expired ones
  SELECT * INTO v_qr_record
  FROM gw_attendance_qr_codes
  WHERE qr_token = qr_token_param
    AND is_active = true;

  -- If not found as active, check if it's a recently expired code (within grace period)
  IF v_qr_record IS NULL THEN
    SELECT * INTO v_qr_record
    FROM gw_attendance_qr_codes
    WHERE qr_token = qr_token_param
      AND expires_at > (NOW() - (v_grace_period_seconds || ' seconds')::interval);
  END IF;

  IF v_qr_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive QR code',
      'error', 'QR_INVALID'
    );
  END IF;

  -- Check if QR code has expired (with grace period already applied above)
  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < (NOW() - (v_grace_period_seconds || ' seconds')::interval) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code has expired. Please ask your instructor for a new code.',
      'error', 'QR_EXPIRED',
      'expired_at', v_qr_record.expires_at
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
    CASE WHEN ip_address_param IS NOT NULL AND ip_address_param != '' 
         THEN ip_address_param::inet 
         ELSE NULL 
    END
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