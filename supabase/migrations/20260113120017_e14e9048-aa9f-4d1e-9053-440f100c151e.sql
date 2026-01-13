-- Add PIN code column to qr_attendance_tokens table for fallback entry
ALTER TABLE public.qr_attendance_tokens 
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(6) DEFAULT NULL;

-- Create function to generate PIN alongside token
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
  v_token_id UUID;
BEGIN
  -- Check permissions (admin, super_admin, or exec_board)
  IF NOT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Generate unique token (base64url encoded)
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Generate 6-digit PIN code
  v_pin_code := LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0');
  
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::INTERVAL;

  -- Deactivate any existing active tokens for this event
  UPDATE qr_attendance_tokens 
  SET is_active = false 
  WHERE event_id = p_event_id AND is_active = true;

  -- Insert new token with PIN
  INSERT INTO qr_attendance_tokens (
    token, pin_code, event_id, created_by, expires_at
  ) VALUES (
    v_token, v_pin_code, p_event_id, p_created_by, v_expires_at
  )
  RETURNING id INTO v_token_id;

  RETURN jsonb_build_object(
    'token', v_token,
    'pin_code', v_pin_code,
    'token_id', v_token_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- Create function to process attendance via PIN code
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
  v_token_record RECORD;
  v_event_record RECORD;
  v_existing_attendance RECORD;
  v_user_profile RECORD;
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

  -- Validate PIN code and get token
  SELECT token, event_id, created_by, expires_at, is_active, scan_count
  INTO v_token_record
  FROM qr_attendance_tokens
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
  WHERE id = v_token_record.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found',
      'error_code', 'EVENT_NOT_FOUND'
    );
  END IF;

  -- Check if attendance already exists
  SELECT status, notes, recorded_at
  INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_token_record.event_id
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
    v_token_record.event_id,
    user_id_param,
    'present',
    'PIN Code Check-in',
    now()
  );

  -- Update token scan count
  UPDATE qr_attendance_tokens
  SET scan_count = scan_count + 1,
      last_used_at = now()
  WHERE pin_code = pin_code_param AND is_active = true;

  -- Log the successful scan
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    user_id_param,
    'pin_attendance_scan',
    'attendance',
    v_event_record.id,
    jsonb_build_object(
      'event_title', v_event_record.title,
      'scan_method', 'pin_code',
      'user_agent', user_agent_param,
      'scan_location', scan_location_param
    )
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully!',
    'event', jsonb_build_object(
      'id', v_event_record.id,
      'title', v_event_record.title,
      'start_date', v_event_record.start_date,
      'event_type', v_event_record.event_type,
      'location', v_event_record.location
    ),
    'user', jsonb_build_object(
      'name', COALESCE(v_user_profile.full_name, v_user_profile.email, 'Unknown User'),
      'email', v_user_profile.email
    ),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    details
  ) VALUES (
    user_id_param,
    'pin_scan_error',
    'attendance',
    jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'pin_provided', pin_code_param IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'An unexpected error occurred. Please try again.',
    'error_code', 'SYSTEM_ERROR'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_qr_attendance_token_with_pin TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pin_attendance_scan TO authenticated;