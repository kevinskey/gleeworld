-- Add PIN code column to gw_attendance_qr_codes table (the active QR codes table)
ALTER TABLE public.gw_attendance_qr_codes 
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6) DEFAULT NULL;

-- Create index for fast PIN lookups
CREATE INDEX IF NOT EXISTS idx_gw_attendance_qr_codes_pin_code 
ON public.gw_attendance_qr_codes(pin_code) 
WHERE pin_code IS NOT NULL AND is_active = true;

-- Drop and recreate the generate function to use the correct table
DROP FUNCTION IF EXISTS public.generate_qr_attendance_token_with_pin(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.generate_qr_attendance_token_with_pin(
  p_event_id UUID,
  p_created_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_pin_code VARCHAR(6);
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_qr_code_id UUID;
BEGIN
  -- Check permissions (admin, super_admin, or exec_board)
  IF NOT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  ) AND NOT EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Generate unique token (base64url encoded)
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Generate 6-digit PIN code (ensure uniqueness among active codes)
  LOOP
    v_pin_code := LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM gw_attendance_qr_codes 
      WHERE pin_code = v_pin_code AND is_active = true AND expires_at > now()
    );
  END LOOP;
  
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::INTERVAL;

  -- Deactivate any existing active QR codes for this event
  UPDATE gw_attendance_qr_codes 
  SET is_active = false 
  WHERE event_id = p_event_id AND is_active = true;

  -- Insert new QR code with PIN
  INSERT INTO gw_attendance_qr_codes (
    event_id, qr_token, pin_code, generated_by, expires_at, is_active, scan_count
  ) VALUES (
    p_event_id, v_token, v_pin_code, p_created_by, v_expires_at, true, 0
  )
  RETURNING id INTO v_qr_code_id;

  RETURN jsonb_build_object(
    'token', v_token,
    'pin_code', v_pin_code,
    'token_id', v_qr_code_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- Drop and recreate the PIN processing function to use the correct table
DROP FUNCTION IF EXISTS public.process_pin_attendance_scan(VARCHAR, UUID, JSONB, TEXT);

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

  -- Log the scan in gw_attendance_qr_scans if table exists
  BEGIN
    INSERT INTO gw_attendance_qr_scans (
      qr_code_id,
      user_id,
      scan_status,
      scan_location,
      user_agent,
      created_at
    ) VALUES (
      v_qr_record.id,
      user_id_param,
      'success',
      scan_location_param,
      user_agent_param,
      now()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip logging
    NULL;
  END;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_qr_attendance_token_with_pin(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pin_attendance_scan(VARCHAR, UUID, JSONB, TEXT) TO authenticated;